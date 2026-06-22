import "dotenv/config";
import { matchSuggestions } from "../src/services/match-service";
import { calendarDate } from "../src/lib/calendar-date";
import { prismaAdmin } from "../src/lib/prisma-admin";

const USER = "3cc810dd-49d2-4657-8a03-d8477a1c6abd"; // owner@test.local
const WS = "seed-ws-personal";

async function main() {
  const s = await matchSuggestions(USER, WS, calendarDate("2026-06-22"));
  console.log(JSON.stringify(s, null, 2));
}

main()
  .then(() => prismaAdmin.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prismaAdmin.$disconnect();
    process.exit(1);
  });
