// Chargement minimal d'assets raster (cahier des charges V2, priorité 3 :
// "faire l'intégration minimale, propre et réutilisable pour que d'autres
// assets puissent être ajoutés plus tard"). Volontairement PAS un moteur
// de sprites complet (pas d'atlas, pas d'animation) -- juste un
// chargement d'image robuste avec état observable, pour que le code de
// rendu puisse choisir un fallback Canvas si le chargement échoue, sans
// jamais casser l'écran ni bloquer le jeu.
export function loadSprite(src) {
  const state = { status: "loading", image: null };
  const img = new Image();
  img.onload = () => {
    state.status = "loaded";
    state.image = img;
  };
  img.onerror = () => {
    state.status = "error";
  };
  img.src = src;
  return state;
}
