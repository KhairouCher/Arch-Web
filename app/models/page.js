import Header from "../components/Header";
import Footer from "../components/Footer";
import { getModels } from "../lib/models";
import { UI } from "../lib/ui";
import ModelsClient from "./ModelsClient";

// The public gallery of models (presentations of several pages). Each shows its
// tier and its price in points. Previews carry a watermark until bought.
export default function ModelsPage() {
  return (
    <div style={UI.page}>
      <Header />
      <ModelsClient models={getModels()} />
      <Footer />
    </div>
  );
}
