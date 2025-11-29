import React, { useState } from 'react';
import LiveAgent from './components/LiveAgent';
import RestaurantInfo from './components/RestaurantInfo';
import { UtensilsCrossed, Phone } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-shahi-dark text-shahi-cream font-sans selection:bg-shahi-gold selection:text-shahi-red">
      {/* Header */}
      <header className="py-6 border-b border-shahi-gold/30 bg-shahi-red sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-shahi-gold rounded-full text-shahi-red">
              <UtensilsCrossed size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-shahi-gold tracking-wider">
                SHAHI NIHAR
              </h1>
              <p className="text-xs text-shahi-gold/80 tracking-widest uppercase">
                Taste of Royalty
              </p>
            </div>
          </div>
          <a href="tel:+13125550199" className="hidden md:flex items-center gap-2 text-shahi-gold hover:text-white transition-colors">
            <Phone size={18} />
            <span className="font-serif">Reserve Now</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start py-8 md:py-12 px-4 gap-12 bg-[url('https://picsum.photos/id/431/1920/1080')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/80">
        
        {/* Voice Agent Section */}
        <section className="w-full max-w-2xl animate-fade-in-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-4 drop-shadow-md">
              Your Table Awaits
            </h2>
            <p className="text-lg text-shahi-cream/90 max-w-lg mx-auto font-light">
              Speak with Ananya, our virtual concierge, to reserve your table or inquire about our exquisite North Indian cuisine.
            </p>
          </div>
          
          <LiveAgent />
        </section>

        {/* Info Section */}
        <section className="w-full max-w-4xl">
          <RestaurantInfo />
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-shahi-red py-8 border-t border-shahi-gold/30">
        <div className="container mx-auto px-4 text-center">
          <p className="font-serif text-shahi-gold text-lg mb-2">Shahi Nihar Restaurant</p>
          <p className="text-sm opacity-70">Devon Avenue, Chicago, IL</p>
          <p className="text-xs opacity-50 mt-4">&copy; {new Date().getFullYear()} Shahi Nihar. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;