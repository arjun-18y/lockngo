import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Lock, Shield, Clock, MapPin, Camera, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10 pointer-events-none"></div>
        <div className="container relative z-10 mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Travel Light,
                <br />
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Travel Safe
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Smart, secure luggage storage at Indian railway stations. Book your locker in
                seconds, access with QR code or PIN.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/stations">
                  <Button size="lg" className="shadow-primary">
                    Book a Locker Now
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-5 w-5 text-secondary" />
                <span>CCTV Monitored • Insured • 24/7 Accessible</span>
              </div>
            </div>
            <div className="relative">
              <img
                src={heroImage}
                alt="Smart lockers at railway station"
                className="rounded-2xl shadow-medium"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose LockNGo?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              India's first tech-enabled luggage storage system designed for modern travelers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Smart Digital Lockers</h3>
                <p className="text-muted-foreground">
                  Access your locker with QR code or PIN. No keys, no hassle. Just scan and go.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">CCTV Monitored</h3>
                <p className="text-muted-foreground">
                  24/7 surveillance and security monitoring. Your belongings are always safe with
                  us.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Flexible Booking</h3>
                <p className="text-muted-foreground">
                  Book hourly or daily. Choose the duration that fits your travel plans perfectly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Simple, fast, and secure in just 3 steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Choose Location</h3>
              <p className="text-muted-foreground">
                Select your railway station and preferred locker size
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Book & Pay</h3>
              <p className="text-muted-foreground">
                Choose duration, make secure payment via Razorpay
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Access with QR/PIN</h3>
              <p className="text-muted-foreground">
                Receive QR code & PIN, access your locker anytime
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/stations">
              <Button size="lg">Get Started Now</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Travel Hassle-Free?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of travelers who trust LockNGo for secure luggage storage across India
          </p>
          <Link to="/auth?signup=true">
            <Button size="lg" variant="secondary" className="shadow-lg">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
