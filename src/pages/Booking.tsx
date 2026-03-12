import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Station {
  id: string;
  name: string;
  city: string;
}

interface Locker {
  id: string;
  locker_number: string;
  size: string;
  hourly_rate: number;
  daily_rate: number;
}

interface LockerSizeMeta {
  name: string;
  display_name: string;
  dimensions: string | null;
}

interface LockerSizeOption {
  size: string;
  displayName: string;
  dimensions: string | null;
  availableCount: number;
  sampleLocker: Locker;
}

const FALLBACK_LOCKER_SIZES: LockerSizeMeta[] = [
  { name: "small", display_name: "Small", dimensions: "Side 35 cm, Height 40 cm" },
  { name: "medium", display_name: "Medium", dimensions: "Side 45 cm, Height 55 cm" },
  { name: "large", display_name: "Large", dimensions: "Side 60 cm, Height 75 cm" },
];

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8081").replace(/\/+$/, "");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState(searchParams.get("station") || "");
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [lockerSizesByName, setLockerSizesByName] = useState<Record<string, LockerSizeMeta>>({});
  const [selectedLockerSize, setSelectedLockerSize] = useState("");
  const [durationType, setDurationType] = useState<"hourly" | "daily">("hourly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [hours, setHours] = useState("4");
  const [bookingStatusMessage, setBookingStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchStations();
    fetchLockerSizes();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchLockers(selectedStation);
    }
  }, [selectedStation]);

  useEffect(() => {
    if (!selectedStation) return;

    const channel = supabase
      .channel(`booking-lockers-${selectedStation}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lockers", filter: `station_id=eq.${selectedStation}` },
        () => {
          fetchLockers(selectedStation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStation]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to book a locker");
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from("stations")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error(error.message);
      return;
    }

    setStations(data || []);
  };

  const fetchLockerSizes = async () => {
    const { data, error } = await supabase.from("locker_sizes").select("name, display_name, dimensions");

    if (error) {
      // Backward-compatible fallback when locker_sizes migration is not applied yet.
      if (error.message.includes("public.locker_sizes")) {
        const fallbackByName = FALLBACK_LOCKER_SIZES.reduce<Record<string, LockerSizeMeta>>(
          (acc, row) => {
            acc[row.name] = row;
            return acc;
          },
          {}
        );
        setLockerSizesByName(fallbackByName);
        return;
      }
      toast.error(error.message);
      return;
    }

    const byName = (data || []).reduce<Record<string, LockerSizeMeta>>((acc, row) => {
      acc[row.name] = row;
      return acc;
    }, {});
    setLockerSizesByName(byName);
  };

  const fetchLockers = async (stationId: string) => {
    const { data, error } = await supabase
      .from("lockers")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "available");

    if (error) {
      toast.error(error.message);
      return;
    }

    setLockers(data || []);
  };

  const lockerSizeOptions = useMemo<LockerSizeOption[]>(() => {
    const bySize = new Map<string, Locker[]>();
    for (const locker of lockers) {
      const current = bySize.get(locker.size) || [];
      current.push(locker);
      bySize.set(locker.size, current);
    }

    return Array.from(bySize.entries())
      .map(([size, sizeLockers]) => ({
        size,
        displayName: lockerSizesByName[size]?.display_name || size,
        dimensions: lockerSizesByName[size]?.dimensions || null,
        availableCount: sizeLockers.length,
        sampleLocker: sizeLockers[0],
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [lockers, lockerSizesByName]);

  useEffect(() => {
    if (!selectedLockerSize) return;
    if (!lockerSizeOptions.some((x) => x.size === selectedLockerSize)) {
      setSelectedLockerSize("");
    }
  }, [selectedLockerSize, lockerSizeOptions]);

  const calculateAmount = () => {
    const selectedOption = lockerSizeOptions.find((x) => x.size === selectedLockerSize);
    if (!selectedOption) return 0;

    if (durationType === "hourly") {
      return selectedOption.sampleLocker.hourly_rate * parseInt(hours || "0");
    } else {
      return selectedOption.sampleLocker.daily_rate * parseInt(hours || "0");
    }
  };

  const handleBooking = async () => {
    if (!selectedStation || !selectedLockerSize || !hours) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    setBookingStatusMessage(null);
    
    try {
      const selectedLockerData = lockers.find((locker) => locker.size === selectedLockerSize);
      if (!selectedLockerData) {
        toast.error("No lockers available for selected size. Please try another size.");
        return;
      }

      const amount = calculateAmount();
      const endDate = new Date(startDate);
      
      if (durationType === "hourly") {
        endDate.setHours(endDate.getHours() + parseInt(hours));
      } else {
        endDate.setDate(endDate.getDate() + parseInt(hours));
      }

      // Generate PIN code
      const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          station_id: selectedStation,
          locker_id: selectedLockerData.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          duration_type: durationType,
          amount,
          payment_status: "pending",
          pin_code: pinCode,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Update locker status
      const { error: lockerUpdateError } = await supabase
        .from("lockers")
        .update({ status: "booked", current_booking_id: booking.id })
        .eq("id", selectedLockerData.id);
      if (lockerUpdateError) throw lockerUpdateError;

      // In a real app, integrate Razorpay here
      // For now, mark as completed
      const { error: bookingUpdateError } = await supabase
        .from("bookings")
        .update({ payment_status: "completed" })
        .eq("id", booking.id);
      if (bookingUpdateError) throw bookingUpdateError;

      const { error: paymentInsertError } = await supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          user_id: user.id,
          amount,
          payment_method: "razorpay",
          status: "completed",
        });
      if (paymentInsertError) throw paymentInsertError;

      const selectedStationData = stations.find((station) => station.id === selectedStation);
      if (user?.email) {
        try {
          const emailResponse = await fetch(`${backendBaseUrl}/api/email/booking-confirmation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: user.email,
              bookingId: booking.id,
              stationName: selectedStationData?.name || "Selected Station",
              stationCity: selectedStationData?.city || "",
              lockerNumber: selectedLockerData?.locker_number || "N/A",
              lockerSize: selectedLockerData?.size || "N/A",
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              durationType,
              durationValue: hours,
              amount,
              pinCode: pinCode,
            }),
          });

          if (!emailResponse.ok) {
            let detailedError = `HTTP ${emailResponse.status}`;
            try {
              const body = await emailResponse.json();
              if (body && typeof body === "object") {
                if ("message" in body && typeof body.message === "string") {
                  detailedError = body.message;
                } else if ("error" in body && typeof body.error === "string") {
                  detailedError = body.error;
                }
              }
            } catch {
              try {
                const text = await emailResponse.text();
                if (text) detailedError = text;
              } catch {
                // Keep fallback HTTP status message.
              }
            }

            const message = `Booking confirmed, but email failed: ${detailedError}`;
            toast.error(message);
            setBookingStatusMessage({ type: "error", text: message });
          } else {
            const message = "Confirmation email sent.";
            toast.success(message);
            setBookingStatusMessage({ type: "success", text: message });
          }
        } catch (emailRequestError: any) {
          const message = `Booking confirmed, but email failed: ${emailRequestError?.message || "Unable to reach backend email service."}`;
          toast.error(message);
          setBookingStatusMessage({ type: "error", text: message });
        }
      } else {
        console.warn("Booking confirmation email skipped: user email missing", { userId: user?.id });
        const message = "Booking confirmed, but account email is missing.";
        toast.error(message);
        setBookingStatusMessage({ type: "error", text: message });
      }

      toast.success("Booking confirmed! Redirecting to dashboard...");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedLockerOption = lockerSizeOptions.find((x) => x.size === selectedLockerSize);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Book a Locker</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Station</Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}, {station.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedStation && lockerSizeOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Locker Size</Label>
                    <RadioGroup value={selectedLockerSize} onValueChange={setSelectedLockerSize}>
                      {lockerSizeOptions.map((option) => (
                        <div key={option.size} className="flex items-center space-x-2 border p-4 rounded-lg">
                          <RadioGroupItem value={option.size} id={`size-${option.size}`} />
                          <Label htmlFor={`size-${option.size}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold">{option.displayName} Locker</div>
                                <div className="text-sm text-muted-foreground">
                                  Quantity available: {option.availableCount}
                                </div>
                                {option.dimensions && (
                                  <div className="text-sm text-muted-foreground">{option.dimensions}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">INR {option.sampleLocker.hourly_rate}/hr</div>
                                <div className="text-sm text-muted-foreground">
                                  INR {option.sampleLocker.daily_rate}/day
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {selectedStation && lockerSizeOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No lockers available at this station right now.
                  </p>
                )}

                {selectedLockerSize && (
                  <>
                    <div className="space-y-2">
                      <Label>Duration Type</Label>
                      <RadioGroup value={durationType} onValueChange={(v: any) => setDurationType(v)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hourly" id="hourly" />
                          <Label htmlFor="hourly">Hourly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily">Daily</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label>{durationType === "hourly" ? "Number of Hours" : "Number of Days"}</Label>
                      <Select value={hours} onValueChange={setHours}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {durationType === "hourly"
                            ? [2, 4, 6, 8, 12].map((h) => (
                                <SelectItem key={h} value={h.toString()}>
                                  {h} hours
                                </SelectItem>
                              ))
                            : [1, 2, 3, 5, 7].map((d) => (
                                <SelectItem key={d} value={d.toString()}>
                                  {d} {d === 1 ? "day" : "days"}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Start Date & Time</Label>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        className="rounded-md border"
                        disabled={(date) => date < new Date()}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStation && selectedLockerOption ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Locker Type</span>
                        <span className="font-semibold">{selectedLockerOption.displayName}</span>
                      </div>
                      {selectedLockerOption.dimensions && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Dimensions</span>
                          <span className="font-semibold">{selectedLockerOption.dimensions}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available</span>
                        <span className="font-semibold">{selectedLockerOption.availableCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-semibold">
                          {hours} {durationType === "hourly" ? "hours" : "days"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-semibold">
                          INR {durationType === "hourly" ? selectedLockerOption.sampleLocker.hourly_rate : selectedLockerOption.sampleLocker.daily_rate}/
                          {durationType === "hourly" ? "hr" : "day"}
                        </span>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Amount</span>
                        <span className="text-2xl font-bold text-primary">INR {calculateAmount()}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleBooking}
                      disabled={loading || !hours}
                    >
                      {loading ? "Processing..." : "Proceed to Payment"}
                    </Button>

                    {bookingStatusMessage && (
                      <div
                        className={`rounded-md border p-3 text-sm ${
                          bookingStatusMessage.type === "success"
                            ? "border-green-600/40 bg-green-600/10 text-green-700"
                            : "border-red-600/40 bg-red-600/10 text-red-700"
                        }`}
                      >
                        {bookingStatusMessage.text}
                      </div>
                    )}

                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Please select a station and locker to see booking details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}


