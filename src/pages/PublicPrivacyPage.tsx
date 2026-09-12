import Privacy from "@/pages/Privacy";
import PrivacyEnglish from "@/pages/PrivacyEnglish";
import { PublicLanguageSwitch } from "@/components/public/PublicLanguageSwitch";
import { usePublicLanguage } from "@/contexts/PublicLanguageContext";

const PublicPrivacyPage = () => {
  const { language } = usePublicLanguage();

  if (language === "en") return <PrivacyEnglish />;

  return (
    <div className="bg-background">
      <div className="flex justify-end px-6 pt-4"><PublicLanguageSwitch /></div>
      <Privacy />
    </div>
  );
};

export default PublicPrivacyPage;
