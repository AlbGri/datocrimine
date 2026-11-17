import { leggiTerritori } from "@/lib/territori";
import { Territori } from "./territori";

export default function Page() {
  return <Territori territori={leggiTerritori()} />;
}
