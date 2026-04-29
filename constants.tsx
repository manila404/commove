
import React from 'react';

export const BACOOR_BARANGAYS: string[] = [
    'Alima', 'Aniban I', 'Aniban II', 'Aniban III', 'Aniban IV', 'Aniban V', 
    'Banalo', 'Bayanan', 'Camposanto', 'Daang Bukid', 'Digman', 'Dulong Bayan', 
    'Habay I', 'Habay II', 'Kaingin', 'Ligas I', 'Ligas II', 'Ligas III', 
    'Mabolo I', 'Mabolo II', 'Mabolo III', 'Maliksi I', 'Maliksi II', 'Maliksi III', 
    'Mambog I', 'Mambog II', 'Mambog III', 'Mambog IV', 'Mambog V', 
    'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Molino VI', 'Molino VII', 
    'Niog I', 'Niog II', 'Niog III', 'Panapaan I', 'Panapaan II', 'Panapaan III', 'Panapaan IV', 
    'Panapaan V', 'Panapaan VI', 'Panapaan VII', 'Panapaan VIII', 'Poblacion (Tabing Dagat)', 
    'Queens Row Central', 'Queens Row East', 'Queens Row West', 'Real I', 'Real II', 
    'Salinas I', 'Salinas II', 'Salinas III', 'Salinas IV', 'San Nicolas I', 'San Nicolas II', 
    'San Nicolas III', 'Sineguelasan', 'Talaba I', 'Talaba II', 'Talaba III', 'Talaba IV', 
    'Talaba V', 'Talaba VI', 'Talaba VII', 'Zapote I', 'Zapote II', 'Zapote III', 'Zapote IV', 'Zapote V'
];
export const formatDisplayDate = (dateStr: string | null, endDateStr?: string | null) => {
    if (!dateStr) return '';
    try {
        // Handle YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
        const startDate = new Date(year, month - 1, day);

        if (!endDateStr || endDateStr === dateStr) {
            return startDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }

        const [eyear, emonth, eday] = endDateStr.split('-').map(Number);
        if (isNaN(eyear) || isNaN(emonth) || isNaN(eday)) {
            return startDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }
        const endDate = new Date(eyear, emonth - 1, eday);

        const startMonthStr = startDate.toLocaleDateString('en-US', { month: 'long' });
        const startYear = startDate.getFullYear();
        const endMonthStr = endDate.toLocaleDateString('en-US', { month: 'long' });
        const endYear = endDate.getFullYear();

        if (startYear !== endYear) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }

        if (startMonthStr !== endMonthStr) {
            return `${startMonthStr} ${startDate.getDate()} - ${endMonthStr} ${endDate.getDate()}, ${startYear}`;
        }

        return `${startMonthStr} ${startDate.getDate()}-${endDate.getDate()}, ${startYear}`;
    } catch (e) {
        return dateStr;
    }
};

export const BACOOR_STREETS: string[] = [
    // Major Thoroughfares & Highways
    "Aguinaldo Highway (E. Aguinaldo Hi-Way)",
    "Bacoor Boulevard (Molino Boulevard)",
    "Bacoor-Dasmarinas Road (Molino Road)",
    "Cavitex (Coastal Road)",
    "Daang Hari",
    "Gen. Evangelista St.",
    "NoMo Avenue",
    "Tirona Highway",

    // Local Streets
    "1st St to 9th St",
    "A. Aragon St.",
    "A. Guinto St.",
    "Adelfa",
    "Alima Provincial Road",
    "Andalucia St.",
    "Antonio St.",
    "Aster",
    "B. Guinto St.",
    "Bagong Kalye",
    "Barrio Road",
    "Big Looban",
    "C. Gawaran St.",
    "Cadena De Amor",
    "Calachuchi",
    "Camia",
    "Capt. M. Sarino St.",
    "Carlos St.",
    "Carnation",
    "Champaca",
    "Daang Bukid St.",
    "Daang Reyna St.",
    "Dahlia",
    "Daisy",
    "Dama De Noche",
    "Digman St.",
    "Dollar St.",
    "Duluhan St.",
    "E. Gomez St.",
    "E. Ignacio St.",
    "Enriquez St.",
    "Everlasting",
    "F. Arciaga St.",
    "F. Gaudier St.",
    "Francisco St.",
    "G. Hermosa St.",
    "Gawaran Ave.",
    "Guevara St.",
    "Gumamela",
    "H. F. Rubio St.",
    "Habay Road",
    "Heredero St.",
    "Honeymoon Road",
    "Ignacio St.",
    "Ilang-Ilang",
    "J. Ocampo St.",
    "Jasmine",
    "L. Castro St.",
    "Lily",
    "Little Pasay St.",
    "Looban St. (I, II, III, IV, V, VI, VII)",
    "Lotus",
    "Magnolia St.",
    "Main Blvd. (Queens Row)",
    "Makipot St.",
    "Maligaya St.",
    "Malinis St.",
    "Manggahan St.",
    "Marcos Alvarez Avenue Extension",
    "Masagana St.",
    "Morning Glory",
    "Niog Road",
    "Ocava St.",
    "Old Niog Road",
    "Orchids",
    "P. Martinez St.",
    "P. Ulatan St.",
    "Pag-Asa Road",
    "Pagkakaisa St.",
    "Pagtakhan St.",
    "Palico Daanan",
    "Pangat St.",
    "Petunia",
    "Pogi St.",
    "Public Plaza Rd.",
    "Queens Ave.",
    "Queens Blvd.",
    "Queens Charity St.",
    "Queens Crown St.",
    "Queens Diamond St.",
    "Queens Garden St.",
    "Queens Heart St.",
    "Queens Joy St.",
    "Queens Land St.",
    "Queens Lane St.",
    "Queens Love St.",
    "Queens Main Ave.",
    "Queens Paradise",
    "Queens Park",
    "Queens Royale St.",
    "Queens Triangle St.",
    "Queens View St.",
    "Radial Road II",
    "Rosal",
    "Rose",
    "Rubio St.",
    "Sagana Ave.",
    "Salinas Road",
    "Sambuhat St.",
    "Sampaguita",
    "Santan",
    "Sapang Palay St.",
    "Sapang Pulid",
    "Sgt. Concepcion St.",
    "Sgt. Crisostomo St.",
    "Sgt. Dominador Ignacio St.",
    "Sgt. E. Gavino St.",
    "Sgt. Gaudier St.",
    "Sgt. Ignacio St.",
    "Sgt. Sebastian St.",
    "Silangan St.",
    "Soldier's Hill",
    "Sumilang St.",
    "Sunflower",
    "Tabing Ilog St.",
    "Tincoco St. (Tingcoco St.)",
    "Tolentino St.",
    "Tramo St.",
    "Violeta",
    "Waling-Waling",
    "Watawat St.",
    "Western St.",
    "Yellowbell",
    "Zinnia",

    // Subdivisions, Villages & Compounds
    "AC Villarica Court",
    "Addas Greenfields / Village",
    "Addas Salinas Village/Townhomes",
    "Alido Heights",
    "Alta Homes Sunnyvale",
    "Amaris Homes",
    "Amihan Village",
    "Aming Tahanan Village",
    "Anapid Subdivision",
    "Andrea Village / Ville",
    "Antenor Virata",
    "Arcadia",
    "Aroma",
    "Astroville / Astroland",
    "Aurora Homes",
    "Avida Settings",
    "Ayala Southvale",
    "Azotea Subdivision",
    "Bagong Silang",
    "Bahayang Pag-Asa Subdivision",
    "Bellazona (Aragon/Castille/Navarre)",
    "Bellefort Estate",
    "Bermuda Country Subdivision / Townhomes",
    "BF Ciudad",
    "BF El Grande Homes",
    "BF Topman Homes",
    "Bonair Homes",
    "Boston Place",
    "Breezewood",
    "Brescia",
    "California Executive Villas",
    "California West Hills",
    "Camella Carson",
    "Camella Cerritos",
    "Camella Lessandra",
    "Camella Molino",
    "Camella Sorrento",
    "Camella Springville",
    "Carissa Springville",
    "Carmel Subdivision",
    "Casa Jessica",
    "Casimiro Baytown",
    "Casimiro West Bay",
    "Casimiro Townhomes",
    "Casimiro West Ville",
    "Castaneda Subdivision",
    "Cazaneia",
    "Cecil's Ville",
    "Celestino Subdivision",
    "Celina Royale",
    "Centro",
    "Cherry Homes",
    "Cirmont Industries",
    "Citihomes",
    "Citta Italia",
    "Citta Lessina",
    "City Homes",
    "Ciudad Real",
    "Coastal Woods Village",
    "Coco Ville",
    "Conrado Cuevas / Cuevasville",
    "Consol Subdivision",
    "D.T. Agustin Village",
    "Daang Bukid",
    "Dana Rose Residence",
    "De Castro Subdivision",
    "Delta Executive Homes",
    "Dona Alicia",
    "Dona Ma. Ligaya",
    "Dona Rosalia",
    "Duplex Homes",
    "Eco Trend Subdivision",
    "El Reyno Homes",
    "Elisa Homes",
    "Equity Homes",
    "Esther Ville",
    "Eusebio Compound",
    "Evertown Village",
    "Executive I, II",
    "F. & E. De Castro Subdivision",
    "Familia Saulog",
    "Family Village",
    "Felix Baes",
    "Felizana",
    "Flora Ville",
    "Garden City",
    "Gardenia Valley",
    "Gawaran Heights/Valley",
    "Gemville",
    "Generoso Sarina",
    "Georgetown Heights",
    "Globe Mackay Subdivision",
    "Goodwell Properties",
    "Grand Lakeshore",
    "Grand Maple Creek",
    "Grand Strike Ville",
    "Grand Victor Ville",
    "Great Woods Highlands",
    "Green Breeze Village",
    "Green Lane Villas",
    "Green Point Homes",
    "Green Ridge Ville",
    "Green Square Villas",
    "Green Town Villas",
    "Green Valley Subdivision",
    "Greensite Homes",
    "GSIS Homes",
    "H & M Subdivision",
    "Hauskon Homes",
    "Hidden Garden",
    "Holy Infant of Jesus",
    "Honeycomb Builders",
    "Ignacio Subdivision",
    "Ilaya Salinas",
    "Isla De Balot",
    "J.S. Subdivision",
    "Jardin De Madrid",
    "Jimenez Compound",
    "John Paul Subdivision",
    "Jordan Ville",
    "Juan Cuenca",
    "Justinville",
    "Kalayaan Homes",
    "Kalinga Compound",
    "Kanluran",
    "Katherine Townhomes",
    "Kaunlaran Homes/Village",
    "Kawayanan",
    "Kenmore Homes",
    "Kimberton Ville",
    "Krause Park",
    "La Cristine Townhouse",
    "La Residenza",
    "La Vivienda",
    "Las Colina",
    "Las Villas De Salinas",
    "Lessandra Heights",
    "Likha Village",
    "Lotus Grand",
    "Lotus Lakeside",
    "Lotus Village",
    "Luckyville",
    "Lupang Pangako",
    "Luzville Subdivision",
    "Lynville",
    "M. Reyes Compound",
    "Mabolo",
    "Macaria Homes",
    "Madelaine Place",
    "Magdiwang Subdivision",
    "Malipay",
    "Mambog Ville",
    "Mandarin Coop Ville",
    "Manhattan Residence",
    "Manila Hilton",
    "Manila Pavilion",
    "Manila Remnant",
    "Mapora Realty",
    "Maria Salud",
    "Mariano Compound",
    "Mary Homes",
    "Masaito",
    "Masuerte Ville",
    "Max's Village",
    "Meadow Park",
    "Meadowood Executive Village",
    "Melrose Park",
    "Meralco",
    "Miape",
    "Molino Heights",
    "Molino Homes",
    "Molino Park Homes",
    "Montera Villas",
    "Napoli Di Citta Italia",
    "Nazareth Subdivision",
    "Nemesio Malabanan",
    "New Better Landscape",
    "New Niog Village",
    "Nietos Garden",
    "Oriental Homes",
    "Orientville",
    "Padua Compound",
    "Pag-Asa",
    "Palermo De Citta Italia",
    "Palico Real Niyog",
    "Palo Alto",
    "Paraiso Compound",
    "Parales Manalaysay",
    "Park Dale",
    "Paula Homes",
    "Pentacapital",
    "Perpetual Village VI",
    "Perpetual Village VII",
    "Perpetual Village VIII",
    "Perpetual Village XI",
    "Phil. Acres Village",
    "Ponticelli",
    "Portofino Heights",
    "Portofino North",
    "Princeton Heights",
    "Progressive Village",
    "Queen of Angel",
    "Queen of Anne",
    "Queen of Christina",
    "Queen of Elena",
    "Queen of Maharlika",
    "Queen of Peace",
    "R.S.G. Subdivision",
    "RCD Villas / Subdivision",
    "Ramos Compound",
    "Raymond Villanueva",
    "Reveal Subdivision",
    "Reyna Elena",
    "Rhona Homes / Rhonaville",
    "Ridge Crest",
    "Rofil Subdivision",
    "Rosalia Executive Village",
    "Rosewood Village",
    "S & K Compound",
    "Sabater Compound",
    "Sagana Remville",
    "Sahemes Compound",
    "Saint Anthony",
    "Salinas Ville",
    "Salvador Bangalan",
    "Samahang Nagkakaisa",
    "Sampaguita Subdivision / Village",
    "Sampalukan",
    "San Jose Compound",
    "San Lorenzo Ruiz Homes",
    "San Lucas",
    "San Luis Villa",
    "San Martin De Porres",
    "San Miguel Subdivision",
    "San Rafael Executive Villas",
    "Santero Subdivision",
    "SDSM Subdivision",
    "Semper Homes",
    "Seville Subdivision",
    "Shalimar Homes",
    "Shapell Homes",
    "Shinjuska Townhomes",
    "Sienna Villas",
    "Silver Crest Villas",
    "Silver Homes",
    "Sitio Buhay Na Tubig",
    "Sitio Ibayo",
    "Sitio Kuliglig",
    "Sitio Malumot",
    "Sole Vita",
    "Solis",
    "Soluna",
    "Sorrento Townhomes",
    "South Gawaran",
    "South Susana Homes",
    "Springside Subdivision",
    "Springville Executive",
    "Springville Gardens",
    "Springville Heights",
    "Springville Meadows",
    "Springville South",
    "Springville West",
    "St. Joseph Subdivision",
    "St. Jude Homes",
    "St. Michael Subdivision",
    "Sta. Lucia Village",
    "Stone Hills",
    "Strike Ville",
    "Summer Hills",
    "Tabon",
    "Thailand",
    "The Garden Ohana",
    "Tia Maria Townhomes",
    "Tierra Verde",
    "Topman",
    "Torres Compound",
    "Town & Country West",
    "Tuscany",
    "UCPB Properties",
    "Ugalde Compound",
    "Urban",
    "Valencia Subdivision",
    "Vallejo Place",
    "Valleyfield",
    "Velasquez Comp.",
    "Venezia",
    "Veraville Homes",
    "Verdana Homes",
    "Vicenzia",
    "Victoria Hills / Ville",
    "Villa Alberto",
    "Villa Angelina",
    "Villa Anonuevo",
    "Villa Antonia",
    "Villa Arsenia",
    "Villa Camagong",
    "Villa Esperanza",
    "Villa Felicia",
    "Villa Feliza",
    "Villa Fortuna",
    "Villa Josefa",
    "Villa Kristorey",
    "Villa Lessandra",
    "Villa Maria",
    "Villa Mateo",
    "Villa Modesta",
    "Villa Primarosa",
    "Villa Vieja",
    "Village Homes",
    "Villanueva Village",
    "Villarica Subdivision",
    "Villas Fortuna",
    "Vista Verde South",
    "Vista Verde North",
    "Vita Toscana",
    "Vittoria",
    "Wawa",
    "Wellington Compound",
    "West Bay Homes",
    "WH Land Subdivision",
    "Wood Estate Village",
    "Wood Winds Village",
    "Woodcrest Subdivision",
    "Zapote Subdivision",
    "Zaragoza Compound",
    "Zion Ville"
];

export const BARANGAY_STREETS: Record<string, string[]> = {
    'Digman': ['Digman St.', 'C. Gawaran St.', 'E. Gomez St.', 'Gen. Evangelista St.'],
    'Molino I': ['Bacoor Boulevard (Molino Boulevard)', 'Molino Road', 'Daang Hari', 'Marcos Alvarez Avenue Extension'],
    'Molino II': ['Bacoor Boulevard (Molino Boulevard)', 'Molino Road', 'Soldier\'s Hill'],
    'Molino III': ['Bacoor Boulevard (Molino Boulevard)', 'Molino Road', 'Woodoor St.'],
    'Molino IV': ['Bacoor Boulevard (Molino Boulevard)', 'Molino Road', 'Daang Hari'],
    'Molino V': ['Molino Road', 'Daang Hari'],
    'Molino VI': ['Molino Road', 'Daang Hari'],
    'Molino VII': ['Molino Road', 'Daang Hari'],
    'Talaba I': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road', 'Tramo St.'],
    'Talaba II': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road'],
    'Talaba III': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road'],
    'Talaba IV': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road'],
    'Talaba V': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road'],
    'Talaba VI': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road'],
    'Talaba VII': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Talaba Road'],
    'Niog I': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Niog Road', 'Old Niog Road'],
    'Niog II': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Niog Road'],
    'Niog III': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Niog Road'],
    'Panapaan I': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan II': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan III': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan IV': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan V': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan VI': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan VII': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Panapaan VIII': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Panapaan Road'],
    'Salinas I': ['Salinas Road', 'Aguinaldo Highway (E. Aguinaldo Hi-Way)'],
    'Salinas II': ['Salinas Road', 'Aguinaldo Highway (E. Aguinaldo Hi-Way)'],
    'Salinas III': ['Salinas Road', 'Aguinaldo Highway (E. Aguinaldo Hi-Way)'],
    'Salinas IV': ['Salinas Road', 'Aguinaldo Highway (E. Aguinaldo Hi-Way)'],
    'Real I': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)'],
    'Real II': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)'],
    'Mambog I': ['Bacoor Boulevard (Molino Boulevard)'],
    'Mambog II': ['Bacoor Boulevard (Molino Boulevard)'],
    'Mambog III': ['Bacoor Boulevard (Molino Boulevard)'],
    'Mambog IV': ['Bacoor Boulevard (Molino Boulevard)'],
    'Mambog V': ['Bacoor Boulevard (Molino Boulevard)'],
    'Queens Row Central': ['Main Blvd. (Queens Row)', 'Queens Ave.', 'Queens Blvd.', 'Queens Charity St.', 'Queens Crown St.', 'Queens Diamond St.', 'Queens Garden St.', 'Queens Heart St.', 'Queens Joy St.', 'Queens Land St.', 'Queens Lane St.', 'Queens Love St.', 'Queens Main Ave.', 'Queens Paradise', 'Queens Park', 'Queens Royale St.', 'Queens Triangle St.', 'Queens View St.'],
    'Queens Row East': ['Main Blvd. (Queens Row)', 'Queens Ave.', 'Queens Blvd.'],
    'Queens Row West': ['Main Blvd. (Queens Row)', 'Queens Ave.', 'Queens Blvd.'],
    'Habay I': ['Habay Road', 'Tirona Highway'],
    'Habay II': ['Habay Road', 'Tirona Highway'],
    'Ligas I': ['Bacoor Boulevard (Molino Boulevard)'],
    'Ligas II': ['Bacoor Boulevard (Molino Boulevard)'],
    'Ligas III': ['Bacoor Boulevard (Molino Boulevard)'],
    'San Nicolas I': ['Bacoor Boulevard (Molino Boulevard)'],
    'San Nicolas II': ['Bacoor Boulevard (Molino Boulevard)'],
    'San Nicolas III': ['Bacoor Boulevard (Molino Boulevard)'],
    'Bayanan': ['Bacoor Boulevard (Molino Boulevard)'],
    'Banalo': ['Gen. Evangelista St.', 'Tramo St.'],
    'Alima': ['Alima Provincial Road', 'Gen. Evangelista St.'],
    'Sineguelasan': ['Gen. Evangelista St.'],
    'Mabolo I': ['Gen. Evangelista St.'],
    'Mabolo II': ['Gen. Evangelista St.'],
    'Mabolo III': ['Gen. Evangelista St.'],
    'Maliksi I': ['Gen. Evangelista St.'],
    'Maliksi II': ['Gen. Evangelista St.'],
    'Maliksi III': ['Gen. Evangelista St.'],
    'Kaingin': ['Gen. Evangelista St.'],
    'Daang Bukid': ['Daang Bukid St.', 'Gen. Evangelista St.'],
    'Camposanto': ['Gen. Evangelista St.'],
    'Dulong Bayan': ['Gen. Evangelista St.'],
    'Poblacion (Tabing Dagat)': ['Gen. Evangelista St.', 'Tabing Ilog St.'],
    'Zapote I': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Zapote Road'],
    'Zapote II': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Zapote Road'],
    'Zapote III': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Zapote Road'],
    'Zapote IV': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Zapote Road'],
    'Zapote V': ['Aguinaldo Highway (E. Aguinaldo Hi-Way)', 'Zapote Road'],
    'Aniban I': ['Tirona Highway'],
    'Aniban II': ['Tirona Highway'],
    'Aniban III': ['Tirona Highway'],
    'Aniban IV': ['Tirona Highway'],
    'Aniban V': ['Tirona Highway'],
};

export const RECOMMENDED_VENUES: Record<string, string[]> = {
    'Digman': ['Digman Plaza', 'Digman Covered Court', 'Digman Elementary School'],
    'Molino I': ['SM City Molino', 'SOMO - A Vista Mall', 'Molino Town Center'],
    'Molino II': ['Molino II Covered Court', 'V Central Mall Molino'],
    'Molino III': ['Molino III Barangay Hall', 'Woodoor St. Park'],
    'Molino IV': ['Molino IV Covered Court', 'Daang Hari Open Field'],
    'Habay I': ['SM City Bacoor', 'Habay I Covered Court'],
    'Habay II': ['Habay II Barangay Hall'],
    'Talaba I': ['Talaba I Covered Court', 'Talaba Elementary School'],
    'Talaba II': ['Talaba II Barangay Hall'],
    'Niog I': ['Niog I Covered Court', 'Niog Elementary School'],
    'Panapaan I': ['Panapaan I Covered Court', 'Panapaan Elementary School'],
    'Panapaan II': ['Panapaan II Barangay Hall'],
    'Panapaan III': ['Panapaan III Covered Court'],
    'Panapaan IV': ['Panapaan IV Barangay Hall'],
    'Panapaan V': ['Panapaan V Covered Court'],
    'Panapaan VI': ['Panapaan VI Barangay Hall'],
    'Panapaan VII': ['Panapaan VII Covered Court'],
    'Panapaan VIII': ['Panapaan VIII Barangay Hall'],
    'Salinas I': ['Salinas I Covered Court', 'Salinas Elementary School'],
    'Real I': ['Real I Covered Court'],
    'Real II': ['Real II Barangay Hall'],
    'Mambog I': ['Mambog I Covered Court', 'Mambog Elementary School'],
    'Queens Row Central': ['Queens Row Central Covered Court', 'Queens Row Elementary School'],
    'Ligas I': ['Ligas I Covered Court', 'Ligas Elementary School'],
    'San Nicolas I': ['San Nicolas I Covered Court', 'San Nicolas Elementary School'],
    'Bayanan': ['Bayanan Covered Court', 'Bayanan Elementary School'],
    'Banalo': ['Banalo Covered Court'],
    'Alima': ['Alima Covered Court'],
    'Sineguelasan': ['Sineguelasan Covered Court'],
    'Mabolo I': ['Mabolo I Covered Court'],
    'Maliksi I': ['Maliksi I Covered Court'],
    'Kaingin': ['Kaingin Covered Court'],
    'Daang Bukid': ['Daang Bukid Covered Court'],
    'Camposanto': ['Camposanto Covered Court'],
    'Dulong Bayan': ['Dulong Bayan Covered Court'],
    'Poblacion (Tabing Dagat)': ['Poblacion Covered Court', 'Bacoor Town Plaza'],
    'Zapote I': ['Zapote I Covered Court'],
    'Aniban I': ['Aniban I Covered Court'],
};

export const CATEGORIES = [
  "Concerts",
  "Conference",
  "Arts",
  "Gaming",
  "Business",
  "Cosplay",
  "Competitions",
  "Technology",
  "Health",
  "Expo Events",
  "Cafe"
];

export const BARANGAY_COORDS: Record<string, { lat: number, lng: number }> = {
    'Alima': { lat: 14.4795, lng: 120.9351 },
    'Aniban I': { lat: 14.4518, lng: 120.9575 },
    'Aniban II': { lat: 14.4503, lng: 120.9592 },
    'Aniban III': { lat: 14.4485, lng: 120.9610 },
    'Aniban IV': { lat: 14.4471, lng: 120.9625 },
    'Aniban V': { lat: 14.4452, lng: 120.9645 },
    'Banalo': { lat: 14.4642, lng: 120.9388 },
    'Bayanan': { lat: 14.4239, lng: 120.9902 },
    'Camposanto': { lat: 14.4608, lng: 120.9415 },
    'Daang Bukid': { lat: 14.4589, lng: 120.9410 },
    'Digman': { lat: 14.4552, lng: 120.9392 },
    'Dulong Bayan': { lat: 14.4511, lng: 120.9360 },
    'Habay I': { lat: 14.4476, lng: 120.9536 },
    'Habay II': { lat: 14.4455, lng: 120.9528 },
    'Kaingin': { lat: 14.4566, lng: 120.9431 },
    'Ligas I': { lat: 14.4407, lng: 120.9652 },
    'Ligas II': { lat: 14.4385, lng: 120.9664 },
    'Ligas III': { lat: 14.4365, lng: 120.9680 },
    'Mabolo I': { lat: 14.4601, lng: 120.9380 },
    'Mabolo II': { lat: 14.4579, lng: 120.9385 },
    'Mabolo III': { lat: 14.4560, lng: 120.9382 },
    'Maliksi I': { lat: 14.4530, lng: 120.9417 },
    'Maliksi II': { lat: 14.4515, lng: 120.9429 },
    'Maliksi III': { lat: 14.4498, lng: 120.9442 },
    'Mambog I': { lat: 14.4480, lng: 120.9691 },
    'Mambog II': { lat: 14.4462, lng: 120.9678 },
    'Mambog III': { lat: 14.4443, lng: 120.9659 },
    'Mambog IV': { lat: 14.4414, lng: 120.9621 },
    'Mambog V': { lat: 14.4391, lng: 120.9701 },
    'Molino I': { lat: 14.4328, lng: 120.9855 },
    'Molino II': { lat: 14.4265, lng: 120.9822 },
    'Molino III': { lat: 14.4173, lng: 120.9781 },
    'Molino IV': { lat: 14.4145, lng: 120.9888 },
    'Molino V': { lat: 14.4072, lng: 120.9934 },
    'Molino VI': { lat: 14.4015, lng: 120.9841 },
    'Molino VII': { lat: 14.3941, lng: 120.9942 },
    'Niog I': { lat: 14.4580, lng: 120.9555 },
    'Niog II': { lat: 14.4561, lng: 120.9542 },
    'Niog III': { lat: 14.4542, lng: 120.9529 },
    'Panapaan I': { lat: 14.4712, lng: 120.9475 },
    'Panapaan II': { lat: 14.4695, lng: 120.9482 },
    'Panapaan III': { lat: 14.4681, lng: 120.9490 },
    'Panapaan IV': { lat: 14.4668, lng: 120.9495 },
    'Panapaan V': { lat: 14.4655, lng: 120.9502 },
    'Panapaan VI': { lat: 14.4632, lng: 120.9488 },
    'Panapaan VII': { lat: 14.4646, lng: 120.9465 },
    'Panapaan VIII': { lat: 14.4619, lng: 120.9515 },
    'Poblacion (Tabing Dagat)': { lat: 14.4578, lng: 120.9351 },
    'Queens Row Central': { lat: 14.4285, lng: 120.9768 },
    'Queens Row East': { lat: 14.4299, lng: 120.9795 },
    'Queens Row West': { lat: 14.4271, lng: 120.9741 },
    'Real I': { lat: 14.4449, lng: 120.9478 },
    'Real II': { lat: 14.4428, lng: 120.9495 },
    'Salinas I': { lat: 14.4358, lng: 120.9580 },
    'Salinas II': { lat: 14.4335, lng: 120.9598 },
    'Salinas III': { lat: 14.4312, lng: 120.9615 },
    'Salinas IV': { lat: 14.4290, lng: 120.9632 },
    'San Nicolas I': { lat: 14.4311, lng: 120.9681 },
    'San Nicolas II': { lat: 14.4446, lng: 120.9444 },
    'San Nicolas III': { lat: 14.4368, lng: 120.9555 },
    'Sineguelasan': { lat: 14.4765, lng: 120.9381 },
    'Talaba I': { lat: 14.4760, lng: 120.9405 },
    'Talaba II': { lat: 14.4741, lng: 120.9419 },
    'Talaba III': { lat: 14.4725, lng: 120.9430 },
    'Talaba IV': { lat: 14.4695, lng: 120.9398 },
    'Talaba V': { lat: 14.4705, lng: 120.9442 },
    'Talaba VI': { lat: 14.4688, lng: 120.9455 },
    'Talaba VII': { lat: 14.4670, lng: 120.9468 },
    'Zapote I': { lat: 14.4880, lng: 120.9385 },
    'Zapote II': { lat: 14.4865, lng: 120.9370 },
    'Zapote III': { lat: 14.4850, lng: 120.9362 },
    'Zapote IV': { lat: 14.4811, lng: 120.9401 },
    'Zapote V': { lat: 14.4829, lng: 120.9348 },
};

export const PREDEFINED_AVATARS = [
    "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Milo",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Sophie",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Leo",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Maya",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Charlie",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Bella",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Jack",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Lucy",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Max",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Chloe",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Oscar",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Lily",
    "https://api.dicebear.com/7.x/bottts/svg?seed=George",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Grace",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Harry",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Mia",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Noah",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Emma",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Liam",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Ava",
    "https://api.dicebear.com/7.x/bottts/svg?seed=William",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Sophia",
    "https://api.dicebear.com/7.x/bottts/svg?seed=James",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Isabella",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Benjamin",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Charlotte",
];

export const CommoveLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 200 200" 
    className={className}
    fill="none"
  >
    <defs>
        <mask id="biteMask">
            <rect width="100%" height="100%" fill="white" />
            <circle cx="100" cy="80" r="45" fill="black" />
            <circle cx="155" cy="35" r="35" fill="black" />
        </mask>
    </defs>
    <path 
      d="M100 0C55.817 0 20 35.817 20 80c0 44.183 80 120 80 120s80-75.817 80-120c0-44.183-35.817-80-80-80z" 
      fill="#6D28D9" 
      mask="url(#biteMask)"
    />
    <circle cx="100" cy="80" r="22" fill="#6D28D9" />
  </svg>
);

export const MapIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 11V9" />
    </svg>
);

export const LocationIcon: React.FC<{className?: string; style?: React.CSSProperties}> = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.1.4-.223.654-.369.395-.226.86-.52 1.358-.863.498-.344 1.015-.746 1.516-1.182.501-.436.98-.92 1.415-1.442a10.026 10.026 0 002.46-7.052C18 5.482 14.418 2 10 2S2 5.482 2 10c0 2.654.914 5.092 2.46 7.052.435.522.914 1.006 1.415 1.442.501.436 1.018.838 1.516 1.182.498.343.963.637 1.358.863.254.146.468.269.654.369a5.741 5.741 0 00.281.14l.018.008.006.003.002.001zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
);

export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export const BookmarkIcon: React.FC<{ className?: string; filled?: boolean }> = ({ className, filled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
);

export const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <title>Google</title>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

export const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10.007 10.007 0 011.563-3.075m5.786 5.786a3 3 0 11-4.243-4.243m4.243 4.243l4.242-4.242M3.11 9.22l1.63 1.63M21 12a10.007 10.007 0 01-1.563 3.075M21 12C19.728 7.943 15.938 5 11.458 5a10.007 10.007 0 00-3.075 1.563m3.075 1.563L3 3m18 18L3 3" />
    </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

export const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

export const AdminIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />
    </svg>
);

export const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const HelpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
);

export const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
);

export const CompassIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <circle cx="32" cy="32" r="32" fill="black"/>
        <path d="M32 12L42 32H22L32 12Z" fill="#EF4444"/> {/* Red North */}
        <path d="M32 52L22 32H42L32 52Z" fill="white"/>   {/* White South */}
    </svg>
);

export const LocateIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" fill="currentColor" className="text-gray-700 dark:text-gray-200" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
);

export const EnvelopeOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
    </svg>
);

export const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);

export const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

export const MoreVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
);

export const ArrowPathIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);
export const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
    </svg>
);

export const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);
