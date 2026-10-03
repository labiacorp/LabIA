import { cookies } from "next/headers";

import { ACCESS_COOKIE, hasAccessPass } from "@/lib/auth/access-gate";

// Defence in depth: the middleware gates the pages, and a Server Action must not trust that alone.
export const ACCESS_REQUIRED = "Digite o código de acesso para continuar.";
export const hasPass = async () => hasAccessPass((await cookies()).get(ACCESS_COOKIE)?.value);
