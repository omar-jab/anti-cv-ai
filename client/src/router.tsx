import { createBrowserRouter } from "react-router";
import Layout from "@/components/layout/layout";
import PersonaPage from "./routes/dati-generali";
import PersonalitaPage from "./routes/personalita";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "persona",
        Component: PersonaPage,
      },
      {
        path: "personalita",
        Component: PersonalitaPage,
      },
    ],
  },
]);
