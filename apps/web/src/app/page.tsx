"use client";

import { useEffect, useState } from "react";

import { motion, useScroll, useSpring } from "framer-motion";

import { FAQSection } from "./(landing)/components/faq-section";
import { FeaturesSection } from "./(landing)/components/features-section";
import { Footer } from "./(landing)/components/footer";
import { HeroSection } from "./(landing)/components/hero-section";
import { HowItWorksSection } from "./(landing)/components/how-it-works-section";
import { Navigation } from "./(landing)/components/navigation";
import { PricingSection } from "./(landing)/components/pricing-section";
import { SocialProofSection } from "./(landing)/components/social-proof-section";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Progress Bar */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-emerald-400 to-emerald-600"
        style={{ scaleX }}
      />

      {/* Navigation */}
      <Navigation isScrolled={isScrolled} />

      {/* Hero Section */}
      <HeroSection />

      {/* Social Proof */}
      <SocialProofSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Features */}
      <FeaturesSection />

      {/* Pricing */}
      <PricingSection />

      {/* FAQ */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
