"use client";

import { useId, useState } from "react";
import { Languages, SunMoon, Tags, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CategoryChips } from "@/components/CategoryChips";
import { PageHeader } from "@/components/PageHeader";
import { HashtagEditor } from "@/components/settings/HashtagEditor";
import { LanguagePicker } from "@/components/settings/LanguagePicker";
import { ProfileEditor } from "@/components/settings/ProfileEditor";
import { SavedToast, useSavedToast } from "@/components/settings/SavedToast";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleCategory } from "@/store/slices/preferences";

/**
 * Settings: four cards (interests, appearance, language, profile). Nothing needs a Save button:
 * every control writes to the store the moment it changes, the store persists to localStorage, and
 * a "Saved" toast (a `role="status"` region) confirms it. Invalid input is refused inline instead.
 *
 * Layout is container-driven: one column on phones; from 56rem the two small pickers (appearance,
 * language) sit side by side between the two wide cards.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const categories = useAppSelector((s) => s.preferences.categories);
  const { visible, flash } = useSavedToast();
  const [blocked, setBlocked] = useState(false);
  const uid = useId();
  const ids = {
    interests: `${uid}-interests`,
    appearance: `${uid}-appearance`,
    language: `${uid}-language`,
    profile: `${uid}-profile`,
  };

  return (
    <div>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="@container">
        <div className="grid gap-5 @4xl:grid-cols-2">
          <SettingsSection
            index={1}
            icon={Tags}
            headingId={ids.interests}
            title={t("settings.interests")}
            body={t("settings.interestsBody")}
            className="@4xl:col-span-2"
          >
            <div className="grid gap-8 @4xl:grid-cols-2 @4xl:gap-12">
              <div>
                <h3 className="mb-3 text-sm font-medium">{t("settings.categories")}</h3>
                <CategoryChips
                  selected={categories}
                  onToggle={(category) => {
                    setBlocked(false);
                    dispatch(toggleCategory(category));
                    flash();
                  }}
                  onBlocked={() => setBlocked(true)}
                />
                {/* Always mounted, so the explanation is announced when it appears. */}
                <p aria-live="polite" className="mt-3 min-h-5 text-sm text-muted">
                  {blocked ? t("settings.keepOneCategory") : null}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium">{t("settings.hashtags")}</h3>
                <p className="mb-3 mt-1 text-sm text-muted">{t("settings.hashtagsBody")}</p>
                <HashtagEditor onSaved={flash} />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            index={2}
            icon={SunMoon}
            headingId={ids.appearance}
            title={t("settings.appearance")}
            body={t("settings.appearanceBody")}
          >
            <ThemePicker onSaved={flash} />
          </SettingsSection>

          <SettingsSection
            index={3}
            icon={Languages}
            headingId={ids.language}
            title={t("settings.language")}
            body={t("settings.languageBody")}
          >
            <LanguagePicker labelledBy={ids.language} onSaved={flash} />
          </SettingsSection>

          <SettingsSection
            index={4}
            icon={UserRound}
            headingId={ids.profile}
            title={t("settings.profile")}
            body={t("settings.profileBody")}
            className="@4xl:col-span-2"
          >
            <ProfileEditor onSaved={flash} />
          </SettingsSection>
        </div>
      </div>

      <SavedToast visible={visible} />
    </div>
  );
}
