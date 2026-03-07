import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Target, Award } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About LockNGo</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            India's first tech-enabled smart luggage storage system, making railway travel
            convenient and hassle-free for millions of travelers.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-2">
            <CardContent className="p-8 space-y-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Our Mission</h2>
              <p className="text-muted-foreground">
                To revolutionize luggage storage at Indian railway stations by providing secure,
                tech-enabled, and accessible smart locker solutions. We aim to make every journey
                lighter and safer for travelers across India.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-8 space-y-4">
              <div className="h-14 w-14 rounded-full bg-secondary/10 flex items-center justify-center">
                <Award className="h-8 w-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold">Our Vision</h2>
              <p className="text-muted-foreground">
                To become the most trusted luggage storage partner for Indian Railways, expanding
                to every major station and integrating seamlessly with the digital India
                initiative.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why We're Different</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">100% Secure</h3>
              <p className="text-muted-foreground">
                24/7 CCTV monitoring, insurance coverage, and advanced digital locks ensure your
                belongings are always safe.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">Made for Indians</h3>
              <p className="text-muted-foreground">
                Designed specifically for Indian railway travelers with local payment options and
                multi-language support.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Tech-Enabled</h3>
              <p className="text-muted-foreground">
                QR code & PIN access, app-based booking, and instant confirmations make storage
                effortless.
              </p>
            </div>
          </div>
        </div>

        {/* How It Started */}
        <Card className="bg-gradient-card border-2">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground">
              <p>
                LockNGo was born from a simple observation: millions of railway travelers in India
                struggle with heavy luggage, often missing out on exploring cities during layovers
                or waiting periods.
              </p>
              <p>
                We partnered with Indian Railways to create a network of smart, secure lockers at
                major railway stations. Our system combines cutting-edge technology with
                traditional security measures, offering travelers peace of mind at affordable
                rates.
              </p>
              <p>
                Today, LockNGo serves thousands of travelers daily, helping them travel lighter and
                explore more. We're proud to be part of India's digital transformation journey.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary mb-2">50+</div>
            <div className="text-muted-foreground">Railway Stations</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">10K+</div>
            <div className="text-muted-foreground">Smart Lockers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">1M+</div>
            <div className="text-muted-foreground">Happy Travelers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
            <div className="text-muted-foreground">Support Available</div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
