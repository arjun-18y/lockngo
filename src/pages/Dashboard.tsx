import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Lock, QrCode, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  amount: number;
  payment_status: string;
  booking_status: string;
  qr_code: string | null;
  pin_code: string | null;
  duration_type: string;
  stations: {
    name: string;
    city: string;
  };
  lockers: {
    locker_number: string;
    size: string;
  };
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "completed" | "cancelled">("all");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const currentUser = await checkAuth();
      if (!currentUser) return;
      await fetchProfile(currentUser);
      await runExpirySync();
      await fetchBookings();
    };
    init();

    const intervalId = window.setInterval(() => {
      runExpirySync();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return null;
    }
    setUser(session.user);
    return session.user;
  };

  const fetchProfile = async (currentUser: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      setProfileName(currentUser.email?.split("@")[0] || "User");
      setProfilePhone("");
      return;
    }

    setProfileName(data?.full_name || currentUser.email?.split("@")[0] || "User");
    setProfilePhone(data?.phone || "");
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          stations(name, city),
          lockers(locker_number, size)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: unknown) {
      console.error(error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const runExpirySync = async () => {
    const { error } = await supabase.rpc("process_booking_expiries");
    if (error) {
      console.error(error);
    }
  };

  const handleExtendBooking = async (bookingId: string) => {
    setActionBookingId(bookingId);
    try {
      const { data, error } = await supabase.rpc("extend_booking", {
        p_booking_id: bookingId,
        p_units: 1,
      });

      if (error) throw error;

      const extraAmount =
        typeof data === "object" && data !== null && "extra_amount" in data
          ? Number((data as { extra_amount: number }).extra_amount)
          : null;

      toast.success(
        extraAmount !== null
          ? `Booking extended successfully (+INR ${extraAmount}).`
          : "Booking extended successfully."
      );
      await fetchBookings();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Failed to extend booking";
      toast.error(message);
    } finally {
      setActionBookingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Cancel this booking? If eligible, refund will be processed automatically."
    );
    if (!confirmed) return;

    setActionBookingId(bookingId);
    try {
      const { data, error } = await supabase.rpc("cancel_booking", {
        p_booking_id: bookingId,
      });

      if (error) throw error;

      const refundAmount =
        typeof data === "object" && data !== null && "refund_amount" in data
          ? Number((data as { refund_amount: number }).refund_amount)
          : 0;

      toast.success(
        refundAmount > 0
          ? `Booking cancelled. Refund INR ${refundAmount} processed.`
          : "Booking cancelled successfully."
      );
      await fetchBookings();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Failed to cancel booking";
      toast.error(message);
    } finally {
      setActionBookingId(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || "",
          full_name: profileName.trim() || "User",
          phone: profilePhone.trim() || null,
        },
        { onConflict: "id" }
      );

      if (error) throw error;
      toast.success("Profile updated");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const downloadReceipt = (booking: Booking) => {
    const receipt = [
      "LockNGo - Booking Receipt",
      "-------------------------",
      `Invoice ID: INV-${booking.id.slice(0, 8).toUpperCase()}`,
      `Booking ID: ${booking.id}`,
      `Station: ${booking.stations.name}, ${booking.stations.city}`,
      `Locker: ${booking.lockers.locker_number} (${booking.lockers.size})`,
      `Start: ${new Date(booking.start_time).toLocaleString()}`,
      `End: ${new Date(booking.end_time).toLocaleString()}`,
      `Duration Type: ${booking.duration_type}`,
      `Booking Status: ${booking.booking_status}`,
      `Payment Status: ${booking.payment_status}`,
      `Amount Paid: INR ${booking.amount}`,
      `Generated At: ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([receipt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `invoice-${booking.id.slice(0, 8)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const activeBookings = bookings.filter((b) => b.booking_status === "active");
  const pastBookings = bookings.filter((b) => b.booking_status !== "active");
  const filteredPastBookings = pastBookings.filter((booking) => {
    const query = historyQuery.trim().toLowerCase();
    const matchesQuery =
      query.length === 0 ||
      booking.stations.name.toLowerCase().includes(query) ||
      booking.stations.city.toLowerCase().includes(query) ||
      booking.lockers.locker_number.toLowerCase().includes(query);

    const matchesStatus =
      historyStatus === "all" || booking.booking_status === historyStatus;

    const bookingDate = new Date(booking.start_time);
    const fromOk = !historyFrom || bookingDate >= new Date(`${historyFrom}T00:00:00`);
    const toOk = !historyTo || bookingDate <= new Date(`${historyTo}T23:59:59`);

    return matchesQuery && matchesStatus && fromOk && toOk;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Active Bookings ({activeBookings.length})</TabsTrigger>
            <TabsTrigger value="past">Past Bookings ({pastBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Bookings</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any active locker bookings.
                  </p>
                  <Button onClick={() => navigate("/stations")}>Book a Locker</Button>
                </CardContent>
              </Card>
            ) : (
              activeBookings.map((booking) => (
                <Card key={booking.id} className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{booking.stations.name}</CardTitle>
                      <Badge className="bg-secondary">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.stations.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Locker {booking.lockers.locker_number} ({booking.lockers.size})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(booking.start_time).toLocaleDateString()} -{" "}
                            {new Date(booking.end_time).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                        <div className="font-semibold">Access Details</div>
                        {booking.pin_code && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">PIN: </span>
                            <span className="font-mono font-bold">{booking.pin_code}</span>
                          </div>
                        )}
                        {booking.qr_code && (
                          <div className="flex items-center gap-2 text-sm">
                            <QrCode className="h-4 w-4" />
                            <span>QR Code Available</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="text-muted-foreground">Amount: </span>
                          <span className="font-bold">INR {booking.amount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleExtendBooking(booking.id)}
                        disabled={actionBookingId === booking.id}
                      >
                        {actionBookingId === booking.id ? "Please wait..." : "Extend +1"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={actionBookingId === booking.id}
                      >
                        {actionBookingId === booking.id ? "Please wait..." : "Cancel Booking"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            <Card>
              <CardContent className="grid gap-3 py-4 md:grid-cols-4">
                <Input
                  placeholder="Search station/city/locker"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={historyStatus}
                  onChange={(e) =>
                    setHistoryStatus(e.target.value as "all" | "completed" | "cancelled")
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Input
                  type="date"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                />
              </CardContent>
            </Card>

            {filteredPastBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No past bookings found.</p>
                </CardContent>
              </Card>
            ) : (
              filteredPastBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{booking.stations.name}</CardTitle>
                      <Badge variant="secondary">{booking.booking_status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.stations.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span>
                        Locker {booking.lockers.locker_number} ({booking.lockers.size})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(booking.start_time).toLocaleDateString()} -{" "}
                        {new Date(booking.end_time).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Amount Paid: </span>
                      <span className="font-bold">INR {booking.amount}</span>
                    </div>
                    <div className="pt-1">
                      <Button variant="outline" size="sm" onClick={() => downloadReceipt(booking)}>
                        Download Receipt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
