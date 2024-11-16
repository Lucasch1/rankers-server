import { Router } from "express";
import admin from "../firebaseConfig"; // Importe a configuração do Firebase

const router = Router();

// Rota para obter dados do Firestore
router.get("/", async (req, res) => {
    const db = admin.firestore();
    const snapshot = await db.collection("users").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.send(data);
});

// Rota para adicionar um documento ao Firestore
router.post("/add", async (req, res) => {
    const db = admin.firestore();
    const { name, email } = req.body;
    const docRef = db.collection("users").doc();
    await docRef.set({ name, email });
    res.send({ success: true, id: docRef.id });
});

// Rota para atualizar um documento no Firestore
router.put("/update/:id", async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;
    const { name, email } = req.body;
    const docRef = db.collection("users").doc(id);
    await docRef.update({ name, email });
    res.send({ success: true });
});

// Rota para deletar um documento do Firestore
router.delete("/delete/:id", async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;
    const docRef = db.collection("users").doc(id);
    await docRef.delete();
    res.send({ success: true });
});

export default router;
