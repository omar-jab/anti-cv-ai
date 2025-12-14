import {
  createBrowserRouter,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
  RouterProvider as R1,
  useRouteError,
} from "react-router";
import ChatPage from "./routes/chat";

type HandleCheckResponse = {
  handle: string;
  exists: boolean;
  available: boolean;
};

type UserRouteLoaderData = {
  handle: string;
};

async function checkHandle(userHandle: string): Promise<HandleCheckResponse> {
  const res = await fetch(
    `/api/users/handle/${encodeURIComponent(userHandle)}`,
  );

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Response(message || "Invalid handle", { status: res.status });
  }

  const data = (await res.json()) as { handle?: unknown; exists?: unknown };
  if (typeof data?.handle !== "string" || typeof data?.exists !== "boolean") {
    throw new Response("Invalid response from server", { status: 502 });
  }

  return data as HandleCheckResponse;
}

function UserChatPageError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <div>Utente non trovato.</div>;
    }
    if (error.status === 400) {
      return <div>Handle non valido.</div>;
    }
    return <div>Errore ({error.status}).</div>;
  }

  return <div>Errore imprevisto.</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello World</div>,
  },
  {
    path: "/:user_handle",
    loader: async ({ params }: LoaderFunctionArgs) => {
      const userHandle = params.user_handle;
      if (!userHandle) {
        throw new Response("Missing handle", { status: 400 });
      }

      const check = await checkHandle(userHandle);
      if (!check.exists) {
        throw new Response("User not found", { status: 404 });
      }

      return { handle: check.handle } satisfies UserRouteLoaderData;
    },
    element: <ChatPage />,
    errorElement: <UserChatPageError />,
  },
]);

export default function RouterProvider() {
  return <R1 router={router} />;
}
