import { AppDirectory } from "../components/app-directory";
import { getAppDirectory } from "../lib/app-directory";

export default function HomePage() {
  return <AppDirectory apps={getAppDirectory()} />;
}
