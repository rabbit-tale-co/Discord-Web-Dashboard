import { Icon } from "./icon";

export const ArrowIcon = () => (
  <span className="relative flex size-5 items-center justify-center overflow-hidden">
    <Icon
      type="arrow-right"
      className="absolute -translate-x-5 group-active:translate-x-0 sm:group-hover:translate-x-0 sm:group-focus:translate-x-0 transition-transform duration-[400ms] ease-bounce"
    />
    <Icon
      type="arrow-right"
      className="group-active:translate-x-5 sm:group-hover:translate-x-5 transition-transform duration-[400ms] ease-bounce"
    />
  </span>
);
