import Header from "@/components/Header";
import Hero from "@/components/sections/Hero";
import MatchOfTheDay from "@/components/sections/MatchOfTheDay";
import LeagueShowcase from "@/components/sections/Leagueshowcase";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Investment from "@/components/sections/Investment";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

export default function Home() {
  return (
    <main className="bg-[#030712]">
      <Header />
      <Hero />
      <MatchOfTheDay />
      <LeagueShowcase />
      <Features />
      <HowItWorks />
      <Investment />
      <FAQ />
      <Footer />
      <CookieBanner />
    </main>
  );
}