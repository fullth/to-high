import type { ComponentProps } from "react";

// Home loads third-party support widgets. Cross this boundary with a new
// document so their scripts cannot remain in the no-save counseling screen,
// including when users return through browser history.
export function FullPageLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
