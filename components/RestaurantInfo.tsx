import React from 'react';
import { Clock, MapPin, Car } from 'lucide-react';

const RestaurantInfo: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-shahi-cream">
            {/* Hours */}
            <div className="bg-shahi-red/90 border border-shahi-gold/20 p-6 rounded-xl shadow-lg backdrop-blur-sm hover:border-shahi-gold/50 transition-colors">
                <div className="flex items-center gap-3 mb-4 text-shahi-gold">
                    <Clock size={24} />
                    <h3 className="text-xl font-serif">Operating Hours</h3>
                </div>
                <div className="space-y-1 text-sm font-light">
                    <p className="flex justify-between"><span>Mon - Sun:</span> <span>11:00 AM - 11:00 PM</span></p>
                </div>
            </div>

            {/* Location */}
            <div className="bg-shahi-red/90 border border-shahi-gold/20 p-6 rounded-xl shadow-lg backdrop-blur-sm hover:border-shahi-gold/50 transition-colors">
                <div className="flex items-center gap-3 mb-4 text-shahi-gold">
                    <MapPin size={24} />
                    <h3 className="text-xl font-serif">Location</h3>
                </div>
                <p className="text-sm font-light mb-2">
                    2550 W Devon Ave,<br/>
                    Chicago, IL 60659
                </p>
                <p className="text-xs text-shahi-gold/70 italic">Located in the heart of Little India</p>
            </div>

             {/* Parking */}
             <div className="bg-shahi-red/90 border border-shahi-gold/20 p-6 rounded-xl shadow-lg backdrop-blur-sm hover:border-shahi-gold/50 transition-colors">
                <div className="flex items-center gap-3 mb-4 text-shahi-gold">
                    <Car size={24} />
                    <h3 className="text-xl font-serif">Parking</h3>
                </div>
                <p className="text-sm font-light">
                    Private lot available at the rear entrance. Additional street parking available on Devon Ave.
                </p>
            </div>
        </div>
    );
};

export default RestaurantInfo;