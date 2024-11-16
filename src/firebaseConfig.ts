import admin, { ServiceAccount } from "firebase-admin";
import serviceAccount from "../rankers-ethglobal-firebase-adminsdk.json"; // Substitua pelo caminho do seu arquivo JSON

const serviceAccountConfig: ServiceAccount = serviceAccount as ServiceAccount;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConfig),
});

export default admin;
