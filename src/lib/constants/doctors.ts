export interface TimeSlot {
    date: string;
    time: string;
    available: boolean;
}

export interface Doctor {
    doctorId: string;
    name: string;
    specialty: string;
    hospital: string;
    city: string;
    experience: string;
    languages: string[];
    consultationFee: string;
    rating: number;
    reviews: number;
    specialisation: string[];
    slots: TimeSlot[];
}

export const DEMO_DOCTORS: Doctor[] = [
    {
        doctorId: "dr-001",
        name: "Dr. Meera Nair",
        specialty: "Gynaecologist & Obstetrician",
        hospital: "Apollo Hospitals, Bannerghatta Road",
        city: "Bangalore",
        experience: "18 years",
        languages: ["English", "Hindi", "Malayalam"],
        consultationFee: "Rs. 800",
        rating: 4.8,
        reviews: 312,
        specialisation: ["PCOS", "Irregular Cycles", "Endometriosis", "Fertility"],
        slots: [
            { date: "Today", time: "4:00 PM", available: true },
            { date: "Today", time: "5:30 PM", available: false },
            { date: "Tomorrow", time: "10:00 AM", available: true },
            { date: "Tomorrow", time: "11:30 AM", available: true },
        ]
    },
    {
        doctorId: "dr-002",
        name: "Dr. Priya Subramanian",
        specialty: "Reproductive Endocrinologist",
        hospital: "Manipal Hospital, Whitefield",
        city: "Bangalore",
        experience: "12 years",
        languages: ["English", "Tamil", "Kannada"],
        consultationFee: "Rs. 1200",
        rating: 4.9,
        reviews: 189,
        specialisation: ["PCOS", "Hormonal Patterns", "Thyroid", "Cycle Irregularity"],
        slots: [
            { date: "Tomorrow", time: "9:00 AM", available: true },
            { date: "Tomorrow", time: "2:00 PM", available: true },
        ]
    },
    {
        doctorId: "dr-003",
        name: "Dr. Anjali Sharma",
        specialty: "Gynaecologist",
        hospital: "Max Healthcare, Saket",
        city: "Delhi",
        experience: "15 years",
        languages: ["English", "Hindi"],
        consultationFee: "Rs. 700",
        rating: 4.7,
        reviews: 445,
        specialisation: ["PCOS", "Endometriosis", "Adolescent Health"],
        slots: [
            { date: "Tomorrow", time: "11:00 AM", available: true },
            { date: "Tomorrow", time: "3:00 PM", available: true },
        ]
    }
];
