import { leggiTerritori } from "@/lib/territori";
import { AllarmeSociale } from "./allarme-sociale";

export default function Page() {
  return <AllarmeSociale territori={leggiTerritori()} />;
}
