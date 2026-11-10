import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FamilyContact } from "@/lib/crm";
import { useI18n } from "@/lib/i18n";

/** Read-only list of the owner's extra family contacts with quick call/WhatsApp. */
export function FamilyContactsList({ contacts }: { contacts: FamilyContact[] }) {
  const { t } = useI18n();
  if (!contacts?.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{t("familyContacts")}</div>
      {contacts.map((c) => {
        const digits = c.phone.replace(/\D/g, "");
        return (
          <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{c.name || "—"}</span>
            {c.role && <span className="text-muted-foreground">({c.role})</span>}
            {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
            {digits.length >= 5 && (
              <span className="flex gap-1">
                <Button asChild size="sm" variant="whatsapp">
                  <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                    {t("whatsapp")}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${c.phone}`}>
                    <Phone />
                    {t("call")}
                  </a>
                </Button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
