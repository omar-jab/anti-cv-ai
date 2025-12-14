import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export type UserProfile = {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    birthDate: string | null;
    imageUrl: string | null;
    updatedAt: string | null;
    handle: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseProfile(value: unknown): UserProfile | null {
    if (value === null) return null;
    if (!isRecord(value)) return null;

    const firstName = typeof value.firstName === "string" ? value.firstName : null;
    const lastName = typeof value.lastName === "string" ? value.lastName : null;
    const email = typeof value.email === "string" ? value.email : null;
    const phone = typeof value.phone === "string" ? value.phone : null;
    const city = typeof value.city === "string" ? value.city : null;
    const birthDate = typeof value.birthDate === "string" ? value.birthDate : null;
    const imageUrl = typeof value.imageUrl === "string" ? value.imageUrl : null;
    const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : null;
    // Handle può essere string o null
    const handle = typeof value.handle === "string" ? value.handle : value.handle === null ? null : null;

    return { firstName, lastName, email, phone, city, birthDate, imageUrl, updatedAt, handle };
}

async function fetchProfile(getToken: () => Promise<string | null>) {
    const token = await getToken();

    const res = await fetch(getApiUrl("/api/profile"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
    }

    const data = (await res.json().catch(() => null)) as
        | { profile?: unknown }
        | null;
    const profile = parseProfile(data?.profile);
    if (!profile) {
        throw new Error("Invalid response");
    }

    return profile;
}

async function updateProfile(params: {
    getToken: () => Promise<string | null>;
    input: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        city?: string;
        birthDate?: string;
        handle?: string;
        image?: File | null;
    };
}) {
    const token = await params.getToken();

    const formData = new FormData();
    formData.set("firstName", params.input.firstName);
    formData.set("lastName", params.input.lastName);
    formData.set("email", params.input.email);
    if (params.input.phone?.trim()) formData.set("phone", params.input.phone.trim());
    if (params.input.city?.trim()) formData.set("city", params.input.city.trim());
    if (params.input.birthDate?.trim()) {
        formData.set("birthDate", params.input.birthDate.trim());
    }
    if (params.input.handle?.trim()) {
        formData.set("handle", params.input.handle.trim());
    }
    if (params.input.image) {
        formData.set("image", params.input.image);
    }

    const res = await fetch(getApiUrl("/api/profile"), {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
    }

    const data = (await res.json().catch(() => null)) as
        | { profile?: unknown }
        | null;
    const profile = parseProfile(data?.profile);
    if (!profile) {
        throw new Error("Invalid response");
    }

    return profile;
}

export function useProfile() {
    const { isLoaded, isSignedIn, getToken, userId } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery<UserProfile, Error>({
        queryKey: ["profile", userId],
        enabled: isLoaded && isSignedIn,
        queryFn: () => fetchProfile(getToken),
    });

    const updateMutation = useMutation<
        UserProfile,
        Error,
        {
            firstName: string;
            lastName: string;
            email: string;
            phone?: string;
            city?: string;
            birthDate?: string;
            handle?: string;
            image?: File | null;
        }
    >({
        mutationFn: (input) => updateProfile({ getToken, input }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        },
    });

    return {
        isLoaded,
        isSignedIn,
        userId,
        profile: query.data ?? null,
        query,
        updateMutation,
    };
}
