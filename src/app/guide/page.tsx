import { DoggyGuideMap } from "@/app/guide/_components/DoggyGuideMap";
import { requireUser } from "@/lib/serverAuth";

export default async function GuidePage() {
  await requireUser();

  return (
    <div className="doggy-guide-page">
      <DoggyGuideMap />
    </div>
  );
}
