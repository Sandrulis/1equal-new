import { createTopicRoute } from "@/app/lib/topic-route";

const route = createTopicRoute("ledus-naudas-uzskaite");

export const revalidate = 3600;
export const generateMetadata = route.generateMetadata;
export default route.Page;
