import { createTopicRoute } from "@/app/lib/topic-route";

// TODO: when a public price is confirmed, add an Offer node. Do not invent an amount before that.
const route = createTopicRoute("cenas");

export const revalidate = 3600;
export const generateMetadata = route.generateMetadata;
export default route.Page;
