import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Lock, Building2, DollarSign, AlertCircle, Wrench } from "lucide-react";

type Station = {
  id: string;
  name: string;
  city: string;
  state: string;
  location: string;
  is_active: boolean;
};

type Locker = {
  id: string;
  station_id: string;
  locker_number: string;
  size: string;
  status: string;
  hourly_rate: number;
  daily_rate: number;
};

type LockerSize = {
  name: string;
  display_name: string;
  dimensions: string | null;
  sort_order: number;
};

type Booking = {
  id: string;
  booking_status: string;
  payment_status: string;
  amount: number;
  locker_id: string;
  stations: { name: string } | null;
  lockers: { locker_number: string; size: string } | null;
};

type Profile = { id: string; full_name: string; email: string; phone: string | null };
type Role = { user_id: string; role: "admin" | "user" };
type Incident = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  station_id: string | null;
  locker_id: string | null;
  created_at: string;
};

const FALLBACK_LOCKER_SIZES: LockerSize[] = [
  {
    name: "small",
    display_name: "Small",
    dimensions: "Side 35 cm, Height 40 cm",
    sort_order: 1,
  },
  {
    name: "medium",
    display_name: "Medium",
    dimensions: "Side 45 cm, Height 55 cm",
    sort_order: 2,
  },
  {
    name: "large",
    display_name: "Large",
    dimensions: "Side 60 cm, Height 75 cm",
    sort_order: 3,
  },
];

const normalizeLockerSizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const formatLockerSizeLabel = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [lockerSizes, setLockerSizes] = useState<LockerSize[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [stationName, setStationName] = useState("");
  const [stationCity, setStationCity] = useState("");
  const [stationState, setStationState] = useState("");
  const [stationLocation, setStationLocation] = useState("");

  const [lockerStationId, setLockerStationId] = useState("");
  const [lockerNumber, setLockerNumber] = useState("");
  const [lockerSize, setLockerSize] = useState("small");
  const [lockerRateHourly, setLockerRateHourly] = useState("20");
  const [lockerRateDaily, setLockerRateDaily] = useState("200");

  const [newLockerSizeName, setNewLockerSizeName] = useState("");
  const [newLockerSizeDimensions, setNewLockerSizeDimensions] = useState("");

  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<Incident["severity"]>("medium");
  const [incidentStationId, setIncidentStationId] = useState("");
  const [incidentLockerId, setIncidentLockerId] = useState("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();
      if (!role) return navigate("/dashboard");

      setCurrentUserId(session.user.id);
      await refreshAll();
      setLoading(false);
    };

    init();
  }, [navigate]);

  useEffect(() => {
    if (lockerSizes.length === 0) return;
    const selectedIsValid = lockerSizes.some((x) => x.name === lockerSize);
    if (!selectedIsValid) {
      setLockerSize(lockerSizes[0].name);
    }
  }, [lockerSizes, lockerSize]);

  const refreshAll = async () => {
    const [s, l, ls, b, p, r, i] = await Promise.all([
      supabase.from("stations").select("*").order("name"),
      supabase.from("lockers").select("*").order("locker_number"),
      supabase.from("locker_sizes").select("*").order("sort_order").order("name"),
      supabase
        .from("bookings")
        .select("id, booking_status, payment_status, amount, locker_id, stations(name), lockers(locker_number, size)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select("id, full_name, email, phone"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    setStations((s.data || []) as Station[]);
    setLockers((l.data || []) as Locker[]);
    if (ls.error?.message.includes("public.locker_sizes")) {
      setLockerSizes(FALLBACK_LOCKER_SIZES);
    } else {
      setLockerSizes((ls.data || []) as LockerSize[]);
    }
    setBookings((b.data || []) as Booking[]);
    setProfiles((p.data || []) as Profile[]);
    setRoles((r.data || []) as Role[]);
    setIncidents((i.data || []) as Incident[]);
  };

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((x) => x.payment_status === "completed")
      .reduce((sum, x) => sum + Number(x.amount), 0);
    const occupancy = lockers.length
      ? (lockers.filter((x) => x.status === "booked").length / lockers.length) * 100
      : 0;
    return {
      revenue,
      occupancy,
      openIncidents: incidents.filter((x) => x.status !== "resolved" && x.status !== "closed")
        .length,
    };
  }, [bookings, lockers, incidents]);

  const adminIds = useMemo(
    () => new Set(roles.filter((x) => x.role === "admin").map((x) => x.user_id)),
    [roles]
  );

  const addStation = async () => {
    if (!stationName.trim() || !stationCity.trim() || !stationState.trim() || !stationLocation.trim()) {
      return toast.error("Station name, city, state and location are required");
    }

    const { error } = await supabase.from("stations").insert({
      name: stationName.trim(),
      city: stationCity.trim(),
      state: stationState.trim(),
      location: stationLocation.trim(),
      is_active: true,
    });

    if (error) return toast.error(error.message);
    setStationName("");
    setStationCity("");
    setStationState("");
    setStationLocation("");
    toast.success("Station created");
    await refreshAll();
  };

  const deleteStation = async (id: string) => {
    const { error } = await supabase.from("stations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refreshAll();
  };

  const addLockerSize = async () => {
    const normalizedName = normalizeLockerSizeName(newLockerSizeName);
    if (!normalizedName) return toast.error("Enter a valid locker size name");

    const { error } = await supabase.from("locker_sizes").insert({
      name: normalizedName,
      display_name: formatLockerSizeLabel(normalizedName),
      dimensions: newLockerSizeDimensions.trim() || null,
      sort_order: lockerSizes.length + 1,
    });
    if (error) return toast.error(error.message);

    setNewLockerSizeName("");
    setNewLockerSizeDimensions("");
    toast.success("Locker size added");
    await refreshAll();
    setLockerSize(normalizedName);
  };

  const addLocker = async () => {
    if (!lockerStationId) return toast.error("Select a station");
    if (!lockerNumber.trim()) return toast.error("Locker number is required");
    if (!lockerSize) return toast.error("Locker size is required");

    const hourly = Number(lockerRateHourly);
    const daily = Number(lockerRateDaily);
    if (!Number.isFinite(hourly) || hourly <= 0 || !Number.isFinite(daily) || daily <= 0) {
      return toast.error("Hourly and daily rates must be greater than 0");
    }

    const { error } = await supabase.from("lockers").insert({
      station_id: lockerStationId,
      locker_number: lockerNumber.trim(),
      size: lockerSize,
      status: "available",
      hourly_rate: hourly,
      daily_rate: daily,
    });
    if (error) return toast.error(error.message);

    setLockerNumber("");
    toast.success("Locker created");
    await refreshAll();
  };

  const deleteLocker = async (id: string) => {
    const { error } = await supabase.from("lockers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refreshAll();
  };

  const updateBookingStatus = async (booking: Booking, status: "completed" | "cancelled") => {
    const { error } = await supabase
      .from("bookings")
      .update({ booking_status: status })
      .eq("id", booking.id);
    if (error) return toast.error(error.message);

    await supabase
      .from("lockers")
      .update({ status: "available", current_booking_id: null })
      .eq("id", booking.locker_id);
    await refreshAll();
  };

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    if (!makeAdmin && userId === currentUserId) {
      return toast.error("Cannot remove your own admin role");
    }

    const req = makeAdmin
      ? supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" })
      : supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");

    const { error } = await req;
    if (error) return toast.error(error.message);
    await refreshAll();
  };

  const createIncident = async () => {
    if (!incidentTitle.trim() || !incidentDescription.trim()) {
      return toast.error("Incident title and description are required");
    }

    const { error } = await supabase.from("incidents").insert({
      title: incidentTitle.trim(),
      description: incidentDescription.trim(),
      severity: incidentSeverity,
      status: "open",
      station_id: incidentStationId || null,
      locker_id: incidentLockerId || null,
      reported_by: currentUserId,
    });
    if (error) return toast.error(error.message);

    setIncidentTitle("");
    setIncidentDescription("");
    toast.success("Incident created");
    await refreshAll();
  };

  const updateIncidentStatus = async (id: string, status: Incident["status"]) => {
    const { error } = await supabase
      .from("incidents")
      .update({
        status,
        resolved_at:
          status === "resolved" || status === "closed" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await refreshAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12 space-y-6">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="font-bold text-xl">{profiles.length}</div>
                <div className="text-xs text-muted-foreground">Users</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <div className="font-bold text-xl">{stations.length}</div>
                <div className="text-xs text-muted-foreground">Stations</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <div className="font-bold text-xl">{lockers.length}</div>
                <div className="text-xs text-muted-foreground">Lockers</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <div className="font-bold text-xl">
                  {bookings.filter((x) => x.booking_status === "active").length}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <div className="font-bold text-xl">INR {stats.revenue.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <div>
                <div className="font-bold text-xl">{stats.openIncidents}</div>
                <div className="text-xs text-muted-foreground">Incidents</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stations">Stations</TabsTrigger>
            <TabsTrigger value="lockers">Lockers</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Occupancy Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.occupancy.toFixed(1)}%</div>
                <div className="h-3 bg-muted rounded mt-2">
                  <div
                    className="h-3 bg-primary rounded"
                    style={{ width: `${Math.min(100, Math.max(0, stats.occupancy))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Station</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Name"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={stationCity}
                  onChange={(e) => setStationCity(e.target.value)}
                />
                <Input
                  placeholder="State"
                  value={stationState}
                  onChange={(e) => setStationState(e.target.value)}
                />
                <Input
                  placeholder="Location"
                  value={stationLocation}
                  onChange={(e) => setStationLocation(e.target.value)}
                />
                <Button className="md:col-span-4" onClick={addStation}>
                  Create Station
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stations.map((station) => (
                  <div
                    key={station.id}
                    className="flex justify-between items-center border rounded px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold">{station.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {station.city}, {station.state}
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deleteStation(station.id)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lockers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Locker Sizes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="New size (e.g. extra_large)"
                    value={newLockerSizeName}
                    onChange={(e) => setNewLockerSizeName(e.target.value)}
                  />
                  <Input
                    placeholder="Dimensions (e.g. Side 45 cm, Height 55 cm)"
                    value={newLockerSizeDimensions}
                    onChange={(e) => setNewLockerSizeDimensions(e.target.value)}
                  />
                  <div>
                    <Button onClick={addLockerSize}>Add Locker Size</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lockerSizes.map((size) => (
                    <Badge key={size.name} variant="secondary">
                      {size.display_name} ({size.name})
                      {size.dimensions ? ` | ${size.dimensions}` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Locker</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={lockerStationId}
                  onChange={(e) => setLockerStationId(e.target.value)}
                >
                  <option value="">Station</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Locker number"
                  value={lockerNumber}
                  onChange={(e) => setLockerNumber(e.target.value)}
                />

                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={lockerSize}
                  onChange={(e) => setLockerSize(e.target.value)}
                >
                  {lockerSizes.map((size) => (
                    <option key={size.name} value={size.name}>
                      {size.display_name}
                    </option>
                  ))}
                </select>

                <Input
                  type="number"
                  placeholder="Hourly rate"
                  value={lockerRateHourly}
                  onChange={(e) => setLockerRateHourly(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Daily rate"
                  value={lockerRateDaily}
                  onChange={(e) => setLockerRateDaily(e.target.value)}
                />
                <Button onClick={addLocker} disabled={lockerSizes.length === 0}>
                  Create Locker
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lockers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lockers.map((locker) => (
                  <div
                    key={locker.id}
                    className="flex justify-between items-center border rounded px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold">
                        #{locker.locker_number} ({formatLockerSizeLabel(locker.size)})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stations.find((station) => station.id === locker.station_id)?.name || "Unknown"} |{" "}
                        {locker.status}
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deleteLocker(locker.id)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Bookings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex justify-between items-center border rounded px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold">
                        {booking.stations?.name || "-"} | Locker {booking.lockers?.locker_number || "-"} (
                        {booking.lockers?.size ? formatLockerSizeLabel(booking.lockers.size) : "-"})
                      </div>
                      <div className="text-sm text-muted-foreground">INR {booking.amount}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{booking.booking_status}</Badge>
                      {booking.booking_status === "active" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBookingStatus(booking, "completed")}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBookingStatus(booking, "cancelled")}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex justify-between items-center border rounded px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold">{profile.full_name}</div>
                      <div className="text-sm text-muted-foreground">{profile.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={adminIds.has(profile.id) ? "default" : "secondary"}>
                        {adminIds.has(profile.id) ? "Admin" : "User"}
                      </Badge>
                      {adminIds.has(profile.id) ? (
                        <Button size="sm" variant="outline" onClick={() => toggleAdmin(profile.id, false)}>
                          Remove Admin
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toggleAdmin(profile.id, true)}>
                          Make Admin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Incident</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="Title"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                />
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as Incident["severity"])}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={incidentStationId}
                  onChange={(e) => setIncidentStationId(e.target.value)}
                >
                  <option value="">Station (optional)</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={incidentLockerId}
                  onChange={(e) => setIncidentLockerId(e.target.value)}
                >
                  <option value="">Locker (optional)</option>
                  {lockers.map((locker) => (
                    <option key={locker.id} value={locker.id}>
                      {locker.locker_number}
                    </option>
                  ))}
                </select>
                <Input
                  className="md:col-span-2"
                  placeholder="Description"
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                />
                <Button className="md:col-span-2" onClick={createIncident}>
                  Submit Incident
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Incident Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex justify-between items-center border rounded px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold">{incident.title}</div>
                      <div className="text-sm text-muted-foreground">{incident.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{incident.severity}</Badge>
                      <select
                        className="h-9 rounded-md border px-2 text-sm"
                        value={incident.status}
                        onChange={(e) => updateIncidentStatus(incident.id, e.target.value as Incident["status"])}
                      >
                        <option value="open">open</option>
                        <option value="in_progress">in_progress</option>
                        <option value="resolved">resolved</option>
                        <option value="closed">closed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
