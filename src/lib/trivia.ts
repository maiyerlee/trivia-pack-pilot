export const TOPICS = ["movies", "history", "science"] as const;

export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, string> = {
  movies: "Movies",
  history: "History",
  science: "Science",
};

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

export type Question = { q: string; a: string };

export const TRIVIA: Record<Topic, Question[]> = {
  movies: [
    { q: "Which film won the first Academy Award for Best Picture?", a: "Wings (1927)" },
    { q: "Who directed Jurassic Park?", a: "Steven Spielberg" },
    { q: "What is the highest-grossing film of all time?", a: "Avatar" },
    { q: "In The Matrix, which pill does Neo take?", a: "The red pill" },
    { q: "Which actor played Forrest Gump?", a: "Tom Hanks" },
  ],
  history: [
    { q: "In what year did the Berlin Wall fall?", a: "1989" },
    { q: "Who was the first President of the United States?", a: "George Washington" },
    { q: "Which empire was ruled by Genghis Khan?", a: "The Mongol Empire" },
    { q: "What year did World War I begin?", a: "1914" },
    { q: "Which civilization built Machu Picchu?", a: "The Inca" },
  ],
  science: [
    { q: "What is the chemical symbol for gold?", a: "Au" },
    { q: "How many bones are in the adult human body?", a: "206" },
    { q: "What planet is known as the Red Planet?", a: "Mars" },
    { q: "What gas do plants absorb during photosynthesis?", a: "Carbon dioxide" },
    { q: "What is the speed of light in a vacuum?", a: "About 299,792 km per second" },
  ],
};
