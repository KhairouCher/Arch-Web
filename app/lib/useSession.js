"use client";

import { useCallback, useEffect, useState } from "react";
import { getUser } from "./mockAuth";
import { balanceOf } from "./mockStore";

// The signed-in user and their points balance, for the platform pages.
// localStorage does not exist during server rendering, so the real values can
// only be read after mount: the first render (server and client) is the
// "not loaded" state, then an effect fills it in. Reading storage directly in
// render would make the client's first render differ from the server's and
// cause a hydration mismatch. Refreshes when stored data changes, so a
// purchase in one place updates the balance everywhere.
export function useSession() {
  const [session, setSession] = useState({ ready: false, user: null, balance: 0 });

  const refresh = useCallback(() => {
    const user = getUser();
    setSession({ ready: true, user, balance: user ? balanceOf(user.id) : 0 });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    window.addEventListener("archpresent:store", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("archpresent:store", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { ...session, refresh };
}
