/**
 * Le service worker de Nwslo.
 *
 * C'est la seule partie du site qui vit en dehors d'une page ouverte :
 * le systeme le reveille a l'arrivee d'un push, navigateur ferme et
 * telephone verrouille. Tout ce qui est ici doit donc tenir sans
 * aucun etat de l'application.
 *
 * Servi depuis /public pour etre a la racine du domaine : un service
 * worker ne peut controler que son propre dossier et ce qu'il y a
 * dessous, et il lui faut /dashboard.
 */

// Prendre la main tout de suite plutot qu'au prochain lancement : un
// gerant qui vient d'activer les alertes doit etre couvert pour la
// commande qui suit, pas pour celles de demain.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  // Un push sans corps lisible reste un signal : mieux vaut une
  // alerte vague qu'aucune alerte. Le navigateur exige de toute
  // facon qu'on affiche quelque chose.
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = {};
  }

  const titre = donnees.titre || "Nouvelle commande";
  const options = {
    body: donnees.corps || "Ouvrez Nwslo pour la voir.",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    lang: "fr",
    // Le telephone est souvent au fond d'une poche, dans le bruit.
    vibrate: [200, 100, 200, 100, 200],
    // Reste affichee jusqu'a ce qu'on la touche : une commande vue
    // trois minutes trop tard est une commande perdue.
    requireInteraction: true,
    // Meme etiquette = la nouvelle alerte remplace l'ancienne au lieu
    // d'empiler dix lignes pour la meme commande.
    tag: donnees.tag || "commande",
    renotify: true,
    data: { url: donnees.url || "/dashboard/commandes" },
  };

  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const cible = event.notification.data?.url || "/dashboard/commandes";

  // Si les commandes sont deja ouvertes quelque part, on y revient au
  // lieu d'ouvrir un deuxieme onglet sur la meme page.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((fenetres) => {
        for (const fenetre of fenetres) {
          if (fenetre.url.includes("/dashboard/commandes") && "focus" in fenetre) {
            return fenetre.focus();
          }
        }
        return self.clients.openWindow(cible);
      }),
  );
});
