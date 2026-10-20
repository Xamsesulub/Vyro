import { demoRoute } from "../tracking/simulator";
import { Workout } from "../activities/model";
export const people = [
  { id: "demo-alex", name: "Alex", initials: "AL" },
  { id: "demo-nora", name: "Nora", initials: "NO" },
];
export type ActivityPost = {
  id: string;
  authorId: string;
  workout: Workout;
  createdAt: string;
};
export const demoPosts: ActivityPost[] = people.map((p, i) => ({
  id: `post-${p.id}`,
  authorId: p.id,
  createdAt: "2026-10-20T08:00:00Z",
  workout: {
    id: `demo-${i}`,
    title: i ? "Morgentur langs elva" : "Dagens løpetur",
    sport: "Løping",
    distance: 2.2,
    seconds: i ? 740 : 700,
    date: "2026-10-20T08:00:00Z",
    notes: "",
    source: "example",
    visibility: "private",
    route: demoRoute,
  },
}));
export const demoTurfs = [
  {
    id: "akerselva",
    name: "Akerselva nordover",
    ownerId: "demo-alex",
    seconds: 700,
    distance: 2.2,
    points: demoRoute,
    color: "#356618",
  },
  {
    id: "akerselva-south",
    name: "Akerselva sørover",
    ownerId: "demo-nora",
    seconds: 740,
    distance: 2.2,
    points: [...demoRoute].reverse(),
    color: "#7154AD",
  },
];
