import { Workout } from "./model";
// Relative dates keep the example week useful without pretending it is recorded data.
const day = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
export const examples: Workout[] = [
  {
    id: "example-1",
    title: "En rolig start",
    sport: "Løping",
    distance: 5.24,
    seconds: 1812,
    date: day(0),
    notes: "Eksempeløkt. En behagelig tur langs Akerselva.",
    source: "example",
    visibility: "private",
  },
  {
    id: "example-2",
    title: "Litt lenger ut",
    sport: "Fottur",
    distance: 8.6,
    seconds: 6480,
    date: day(1),
    notes: "Eksempeløkt fra en tur i marka.",
    source: "example",
    visibility: "private",
  },
  {
    id: "example-3",
    title: "Byen før den våkner",
    sport: "Sykling",
    distance: 18.4,
    seconds: 3420,
    date: day(3),
    notes: "Eksempeløkt med en rolig sykkeltur.",
    source: "example",
    visibility: "private",
  },
];
