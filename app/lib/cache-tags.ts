import { revalidateTag } from "next/cache";

export function refreshTeamData() {
  revalidateTag("team-data", "max");
}

export function refreshSitePublic() {
  revalidateTag("site-public", "max");
}
