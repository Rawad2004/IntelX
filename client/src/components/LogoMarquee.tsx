"use client";

const logos = ["FootyStats", "OPTA", "StatsBomb", "Wyscout", "InStat", "SofaScore", "FBref", "Understat"];

export default function LogoMarquee() {
  return (
    <section className="py-12 border-y border-white/5">
      <p className="text-center text-caption mb-8">Powered by industry-leading data</p>
      
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
        
        {/* Marquee */}
        <div className="flex animate-marquee">
          {[...logos, ...logos].map((logo, i) => (
            <div
              key={i}
              className="flex items-center gap-2 mx-8 text-white/30 hover:text-white/60 transition-colors whitespace-nowrap"
            >
              <span className="text-[#0A84FF]">●</span>
              <span className="text-lg font-medium">{logo}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  );
}