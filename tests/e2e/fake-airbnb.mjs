// Servidor mínimo que imita o link "Exportar calendário" do Airbnb.
// Bloqueia os dias 20, 21 e 22 do mês seguinte.
import { createServer } from "node:http";
import { nextMonthDay } from "./dates.mjs";

const port = Number(process.argv[2] ?? 3199);
const compact = (d) => d.replace(/-/g, "");

createServer((req, res) => {
  if (req.url !== "/airbnb.ics") {
    res.writeHead(404).end();
    return;
  }
  const ics = [
    "BEGIN:VCALENDAR",
    "PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 1.0//EN",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${compact(nextMonthDay(20))}`,
    `DTEND;VALUE=DATE:${compact(nextMonthDay(23))}`,
    "UID:e2e-reserva@airbnb.com",
    "SUMMARY:Reserved",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  res.writeHead(200, { "content-type": "text/calendar" }).end(ics);
}).listen(port, () => console.log(`fake airbnb em http://localhost:${port}/airbnb.ics`));
