import { useState, useEffect } from "react";
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
import { Lock, Calendar as CalendarIcon } from "lucide-react";

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

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState(searchParams.get("station") || "");
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState("");
  const [durationType, setDurationType] = useState<"hourly" | "daily">("hourly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [hours, setHours] = useState("4");

  useEffect(() => {
    checkAuth();
    fetchStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchLockers(selectedStation);
    }
  }, [selectedStation]);

  useEffect(() => {
    if (!selectedLocker) return;
    if (!lockers.some((locker) => locker.id === selectedLocker)) {
      setSelectedLocker("");
    }
  }, [lockers, selectedLocker]);

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

  const calculateAmount = () => {
    const locker = lockers.find((l) => l.id === selectedLocker);
    if (!locker) return 0;

    if (durationType === "hourly") {
      return locker.hourly_rate * parseInt(hours || "0");
    } else {
      return locker.daily_rate * parseInt(hours || "0");
    }
  };

  const handleBooking = async () => {
    if (!selectedStation || !selectedLocker || !hours) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    
    try {
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
          locker_id: selectedLocker,
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
        .eq("id", selectedLocker);
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

      toast.success("Booking confirmed! Redirecting to dashboard...");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedLockerData = lockers.find((l) => l.id === selectedLocker);

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

                {selectedStation && lockers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Locker Size</Label>
                    <RadioGroup value={selectedLocker} onValueChange={setSelectedLocker}>
                      {lockers.map((locker) => (
                        <div key={locker.id} className="flex items-center space-x-2 border p-4 rounded-lg">
                          <RadioGroupItem value={locker.id} id={locker.id} />
                          <Label htmlFor={locker.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold capitalize">{locker.size} Locker</div>
                                <div className="text-sm text-muted-foreground">
                                  Locker #{locker.locker_number}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{locker.hourly_rate}/hr</div>
                                <div className="text-sm text-muted-foreground">
                                  ₹{locker.daily_rate}/day
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {selectedLocker && (
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
                {selectedStation && selectedLockerData ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Locker Type</span>
                        <span className="font-semibold capitalize">{selectedLockerData.size}</span>
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
                          ₹{durationType === "hourly" ? selectedLockerData.hourly_rate : selectedLockerData.daily_rate}/
                          {durationType === "hourly" ? "hr" : "day"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Amount</span>
                        <span className="text-2xl font-bold text-primary">₹{calculateAmount()}</span>
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

                    <div className="bg-accent/50 p-4 rounded-lg space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span>Secure payment via Razorpay</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Instant QR & PIN access</span>
                      </div>
                    </div>
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
