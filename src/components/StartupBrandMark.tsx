import { BrandSymbol } from "@/components/brand/BrandLogo";

export const STARTUP_BRAND_MARK_SIZE = 192;

const StartupBrandMark = () => (
  <div
    data-startup-brand-mark="true"
    className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 [@media(max-height:640px)]:top-[36%]"
  >
    <BrandSymbol surface="dark" size={STARTUP_BRAND_MARK_SIZE} />
  </div>
);

export default StartupBrandMark;
