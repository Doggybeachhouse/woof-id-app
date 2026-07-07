"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { startOfTodayAmsterdam } from "@/lib/checkin/qrGate";
import { validateRotatingCheckInToken } from "@/lib/checkin/rotatingToken";
import { saveDogPhoto } from "@/lib/dogs/storage";
import { DEFAULT_LOCATION } from "@/lib/gamification/coins";
import { processDogEvent } from "@/lib/gamification/processDogEvent";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import { createUniqueWoofId } from "@/lib/woofId";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

const dogFieldsSchema = z.object({
  name: z.string().min(1).max(80),
  breed: z.string().max(80).optional(),
  birthday: z.string().optional(),
  weightKg: z.string().optional(),
  favoriteSnack: z.string().max(120).optional(),
  favoriteIceCream: z.string().max(120).optional(),
  personality: z.string().max(500).optional(),
  walletCardId: z.string().max(40).optional(),
});

async function parseDogPhoto(formData: FormData, dogId: string) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Foto: alleen JPG, PNG of WebP");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Foto is te groot (max 5 MB)");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveDogPhoto(dogId, buffer, file.type);
}

export async function createDogAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  const parsed = dogFieldsSchema.safeParse({
    name: formData.get("name"),
    breed: formData.get("breed") || undefined,
    birthday: formData.get("birthday") || undefined,
    weightKg: formData.get("weightKg") || undefined,
    favoriteSnack: formData.get("favoriteSnack") || undefined,
    favoriteIceCream: formData.get("favoriteIceCream") || undefined,
    personality: formData.get("personality") || undefined,
    walletCardId: formData.get("walletCardId") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Ongeldige invoer");
  }

  const data = parsed.data;
  const woofId = await createUniqueWoofId(async (id) => {
    const existing = await prisma.dogProfile.findUnique({ where: { woofId: id } });
    return !!existing;
  });

  const dog = await prisma.dogProfile.create({
    data: {
      woofId,
      ownerUserId: userId,
      name: data.name,
      breed: data.breed,
      birthday: data.birthday ? new Date(data.birthday) : null,
      weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
      favoriteSnack: data.favoriteSnack,
      favoriteIceCream: data.favoriteIceCream,
      personality: data.personality,
      walletLink: data.walletCardId?.trim()
        ? {
            create: {
              walletCardId: data.walletCardId.trim(),
              linkedBy: userId,
            },
          }
        : undefined,
    },
  });

  const photoFilename = await parseDogPhoto(formData, dog.id);
  if (photoFilename) {
    await prisma.dogProfile.update({
      where: { id: dog.id },
      data: { photoUrl: photoFilename },
    });
  }

  await processDogEvent({
    dogProfileId: dog.id,
    eventType: "PROFILE_CREATED",
  });

  revalidatePath("/dogs");
  redirect(`/dogs/${dog.id}`);
}

export async function updateDogAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  const dogId = String(formData.get("dogId") ?? "");
  if (!dogId) throw new Error("Hond niet gevonden");

  const dog = await prisma.dogProfile.findFirst({
    where: { id: dogId, ownerUserId: userId },
  });
  if (!dog) throw new Error("Hond niet gevonden");

  const parsed = dogFieldsSchema.safeParse({
    name: formData.get("name"),
    breed: formData.get("breed") || undefined,
    birthday: formData.get("birthday") || undefined,
    weightKg: formData.get("weightKg") || undefined,
    favoriteSnack: formData.get("favoriteSnack") || undefined,
    favoriteIceCream: formData.get("favoriteIceCream") || undefined,
    personality: formData.get("personality") || undefined,
    walletCardId: formData.get("walletCardId") || undefined,
  });

  if (!parsed.success) throw new Error("Ongeldige invoer");
  const data = parsed.data;

  const photoFilename = await parseDogPhoto(formData, dog.id);

  await prisma.dogProfile.update({
    where: { id: dog.id },
    data: {
      name: data.name,
      breed: data.breed || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
      favoriteSnack: data.favoriteSnack || null,
      favoriteIceCream: data.favoriteIceCream || null,
      personality: data.personality || null,
      ...(photoFilename ? { photoUrl: photoFilename } : {}),
    },
  });

  const walletId = data.walletCardId?.trim();
  if (walletId) {
    await prisma.woofWalletLink.upsert({
      where: { dogProfileId: dog.id },
      create: {
        dogProfileId: dog.id,
        walletCardId: walletId,
        linkedBy: userId,
      },
      update: {
        walletCardId: walletId,
        linkedBy: userId,
      },
    });
  }

  revalidatePath(`/dogs/${dog.id}`);
  revalidatePath("/dogs");
  redirect(`/dogs/${dog.id}`);
}

const CHECK_IN_LOCATIONS: Record<string, string> = {
  zandvoort: DEFAULT_LOCATION,
};

export async function submitCheckInAction(formData: FormData) {
  const dogId = String(formData.get("dogProfileId"));
  const locKeyForm = String(formData.get("loc") ?? "zandvoort");
  const tokenForm = String(formData.get("token") ?? "");
  const locName = CHECK_IN_LOCATIONS[locKeyForm] ?? DEFAULT_LOCATION;

  let result: { dogName: string; location: string };
  try {
    result = await checkInDogAction(dogId, locName, {
      loc: locKeyForm,
      token: tokenForm,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Check-in mislukt";
    redirect(
      `/check-in?loc=${encodeURIComponent(locKeyForm)}&token=${encodeURIComponent(tokenForm)}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(
    `/check-in/success?name=${encodeURIComponent(result.dogName)}&loc=${encodeURIComponent(locName)}`,
  );
}

export async function checkInDogAction(
  dogProfileId: string,
  location: string,
  qr?: { loc: string; token: string },
) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  if (qr && !validateRotatingCheckInToken(qr.loc, qr.token)) {
    throw new Error("QR-code verlopen. Scan opnieuw de code in de winkel.");
  }

  const dog = await prisma.dogProfile.findFirst({
    where: { id: dogProfileId, ownerUserId: userId },
  });
  if (!dog) throw new Error("Hond niet gevonden");

  const alreadyToday = await prisma.visit.findFirst({
    where: {
      dogProfileId: dog.id,
      visitedAt: { gte: startOfTodayAmsterdam() },
    },
  });

  if (alreadyToday) {
    throw new Error(
      `${dog.name} heeft vandaag al ingecheckt. Morgen weer welkom!`,
    );
  }

  const visit = await prisma.visit.create({
    data: {
      dogProfileId: dog.id,
      location,
    },
  });

  await processDogEvent({
    dogProfileId: dog.id,
    eventType: "CHECK_IN",
    payload: { visitId: visit.id, location },
  });

  revalidatePath(`/dogs/${dog.id}`);
  revalidatePath("/check-in");
  return { dogName: dog.name, location };
}

export async function registerTopUpAction(formData: FormData) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;
  if (role !== "STAFF" && role !== "ADMIN") {
    throw new Error("Geen toegang");
  }

  const dogProfileId = String(formData.get("dogProfileId") ?? "");
  const amountStr = String(formData.get("amountEur") ?? "");
  const note = String(formData.get("note") ?? "") || undefined;
  const amountEur = parseFloat(amountStr.replace(",", "."));

  if (!dogProfileId || Number.isNaN(amountEur) || amountEur <= 0) {
    throw new Error("Ongeldige invoer");
  }

  const priorCount = await prisma.topUp.count({ where: { dogProfileId } });

  const topUp = await prisma.topUp.create({
    data: {
      dogProfileId,
      amountEur,
      registeredById: userId,
      note,
    },
  });

  await processDogEvent({
    dogProfileId,
    eventType: "TOP_UP",
    payload: {
      topUpId: topUp.id,
      amountEur,
      isFirstTopUp: priorCount === 0,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/dogs/${dogProfileId}`);
}
