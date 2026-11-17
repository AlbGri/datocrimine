import { leggiTerritori } from "@/lib/territori";
import { PersoneDenunciate } from "./persone-denunciate";

export default function Page() {
  return <PersoneDenunciate territori={leggiTerritori()} />;
}
