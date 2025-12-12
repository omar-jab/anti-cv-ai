import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import { Blocks } from "lucide-react";
import { Link } from "react-router";

export default function Header() {
  return (
    <header className="border-b border-b-neutral-100">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-12">
          <div>
            <Blocks className="size-6" />
          </div>

          <ul className="flex items-center gap-6">
            <li className="font-mono text-sm text-neutral-800">
              <Link to={{ pathname: "/persona" }}>
                <span>Dati Generali</span>
              </Link>
            </li>

            <li className="font-mono text-sm text-neutral-800">
              <Link to={{ pathname: "/personalita" }}>
                <span>Personalità</span>
              </Link>
            </li>
          </ul>
        </div>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
