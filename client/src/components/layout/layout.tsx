import { Outlet } from "react-router";
import Header from "@/components/layout/header";

export default function Layout() {
  return (
    <div className="w-screen h-dvh flex flex-col">
      <div className="w-full">
        <Header />
      </div>
      <div className="w-full flex-1 min-h-0 flex min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
