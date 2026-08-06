// Sample Hinglish demo data to showcase Semantic Highlighting instantly.
// Timed to a hosted sample clip so the live preview + sync can be demonstrated
// without waiting on an upload/transcription round-trip.
export const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const w = (text, start, end, entity_type = null) => ({ text, start, end, entity_type });

export const SAMPLE_RESULT = {
  text: "Rahul ne Mumbai mein ek badiya video shoot kiya. Phir woh Delhi gaya aur documentary banai. Priya ne Goa mein poori editing complete ki.",
  words: [
    w("Rahul", 0.0, 0.6, "person"),
    w("ne", 0.6, 0.8),
    w("Mumbai", 0.8, 1.5, "location"),
    w("mein", 1.5, 1.8),
    w("ek", 1.8, 2.0),
    w("badiya", 2.0, 2.5),
    w("video", 2.5, 3.0),
    w("shoot", 3.0, 3.6, "action"),
    w("kiya.", 3.6, 4.0),
    w("Phir", 4.2, 4.5),
    w("woh", 4.5, 4.7),
    w("Delhi", 4.7, 5.3, "location"),
    w("gaya", 5.3, 5.8, "action"),
    w("aur", 5.8, 6.0),
    w("documentary", 6.0, 6.8),
    w("banai.", 6.8, 7.3, "action"),
    w("Priya", 7.6, 8.2, "person"),
    w("ne", 8.2, 8.4),
    w("Goa", 8.4, 8.9, "location"),
    w("mein", 8.9, 9.1),
    w("poori", 9.1, 9.5),
    w("editing", 9.5, 10.1, "action"),
    w("complete", 10.1, 10.7, "action"),
    w("ki.", 10.7, 11.0),
  ],
  segments: [
    { start: 0.0, end: 4.0, text: "Rahul ne Mumbai mein ek badiya video shoot kiya." },
    { start: 4.2, end: 7.3, text: "Phir woh Delhi gaya aur documentary banai." },
    { start: 7.6, end: 11.0, text: "Priya ne Goa mein poori editing complete ki." },
  ],
};
