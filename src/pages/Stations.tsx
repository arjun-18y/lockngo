import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Lock, Search } from "lucide-react";
import { toast } from "sonner";

interface Station {
  id: string;
  name: string;
  city: string;
  state: string;
  location: string;
  total_lockers: number;
  available_lockers: number;
  platform_info: string | null;
}

export default function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("stations-live-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lockers" },
        () => {
          fetchStations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stations" },
        () => {
          fetchStations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStations(stations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = stations.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.city.toLowerCase().includes(query) ||
          station.state.toLowerCase().includes(query)
      );
      setFilteredStations(filtered);
    }
  }, [searchQuery, stations]);

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from("stations")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      const stationRows = data || [];
      const stationIds = stationRows.map((station) => station.id);

      if (stationIds.length === 0) {
        setStations([]);
        setFilteredStations([]);
        return;
      }

      const { data: lockerRows, error: lockersError } = await supabase
        .from("lockers")
        .select("station_id, status")
        .in("station_id", stationIds);

      if (lockersError) throw lockersError;

      const countsByStation = (lockerRows || []).reduce<Record<string, { total: number; available: number }>>(
        (acc, locker) => {
          const current = acc[locker.station_id] || { total: 0, available: 0 };
          current.total += 1;
          if (locker.status === "available") current.available += 1;
          acc[locker.station_id] = current;
          return acc;
        },
        {}
      );

      const stationsWithLiveCounts = stationRows.map((station) => {
        const counts = countsByStation[station.id];
        return {
          ...station,
          total_lockers: counts?.total ?? 0,
          available_lockers: counts?.available ?? 0,
        };
      });

      setStations(stationsWithLiveCounts);
      setFilteredStations(stationsWithLiveCounts);
    } catch (error: any) {
      toast.error("Failed to load stations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Available Stations</h1>
          <p className="text-muted-foreground mb-6">
            Find smart lockers at railway stations across India
          </p>

          {/* Search Bar */}
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by station, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStations.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No stations found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStations.map((station) => (
              <Card
                key={station.id}
                className="hover:shadow-medium transition-shadow border-2 hover:border-primary/50"
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span>{station.name}</span>
                    {station.available_lockers > 0 ? (
                      <Badge className="bg-secondary">Available</Badge>
                    ) : (
                      <Badge variant="destructive">Full</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {station.city}, {station.state}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    <span>
                      <strong>{station.available_lockers}</strong> of{" "}
                      <strong>{station.total_lockers}</strong> lockers available
                    </span>
                  </div>

                  {station.platform_info && (
                    <p className="text-sm text-muted-foreground">{station.platform_info}</p>
                  )}

                  <Link to={`/booking?station=${station.id}`}>
                    <Button
                      className="w-full"
                      disabled={station.available_lockers === 0}
                    >
                      {station.available_lockers > 0 ? "Book Locker" : "No Lockers Available"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
