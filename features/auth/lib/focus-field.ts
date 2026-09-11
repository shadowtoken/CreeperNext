/** Only local validation moves focus, after React has committed the error text. */
export function focusField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLElement)) return;
  requestAnimationFrame(() => {
    if (field.isConnected) field.focus();
  });
}
