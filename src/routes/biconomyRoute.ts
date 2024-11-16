import { Router, Request, Response } from "express";
import admin from "../firebaseConfig"; // Importe a configuração do Firebase
import { baseSepolia } from "viem/chains";
import { encodeFunctionData, Hex, http, parseEther } from "viem";
import { ethers } from "ethers";
import { abi } from "../../hhat/artifacts/contracts/Rankers.sol/Rankers.json";
import {
    createNexusClient,
    createBicoPaymasterClient,
    smartSessionCreateActions,
    toSmartSessionsValidator,
    CreateSessionDataParams,
    SessionData,
    createNexusSessionClient,
    smartSessionUseActions,
} from "@biconomy/sdk";

// const {
//     createNexusClient,
//     createBicoPaymasterClient,
//     smartSessionCreateActions,
//     toSmartSessionsValidator,
// } = require("@biconomy/sdk");

import { privateKeyToAccount } from "viem/accounts";
import { SmartSessionMode } from "@rhinestone/module-sdk";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const db = admin.firestore();
        const doc = await db.collection("users").doc(id).get();

        if (!doc.exists) {
            res.status(404).send({ error: "Document not found" });
            return;
        }

        const docData = doc.data();

        res.status(200).send(docData);
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

router.post("/transaction", async (req: Request, res: Response) => {
    try {
        const { privateKey, to, amount, params } = await req.body;

        const account = privateKeyToAccount(`0x${privateKey}`);

        const bundlerUrl = process.env.BUNDLERS_URL || "";
        const paymasterUrl = process.env.PAYMASTER_URL || "";

        const nexusClient = await createNexusClient({
            signer: account,
            chain: baseSepolia,
            transport: http(),
            bundlerTransport: http(bundlerUrl),
            paymaster: createBicoPaymasterClient({
                paymasterUrl,
            }),
        });

        // console.log("Nexus client created", nexusClient);

        const smartAccountAddress = await nexusClient.account.address;

        console.log("Smart account: ", smartAccountAddress);

        // console.log("Smart account address: ", smartAccountAddress);

        const hash = await nexusClient.sendTransaction({
            calls: [{ to: to, value: parseEther("0") }],
        });
        console.log("Transaction hash: ", hash);
        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        // Converter valores BigInt para string
        const receiptStringified = JSON.parse(
            JSON.stringify(receipt, (key, value) =>
                typeof value === "bigint" ? value.toString() : value
            )
        );

        res.status(200).send({ hash, receipt: receiptStringified });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

router.post("/rankersCreate", async (req: Request, res: Response) => {
    try {
        const { privateKey, params, functionName } = await req.body;

        const url = process.env.RPC_URL as string;
        const provider = new ethers.JsonRpcProvider(url);
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(
            `0x${process.env.RANKERS_ADDRESS}`,
            abi,
            signer
        );

        const createGoalFunction = contract.getFunction(functionName);

        const mintTx = await createGoalFunction.populateTransaction(
            params.name,
            params.description,
            params.category,
            params.frequency,
            params.target,
            params.minimumBet,
            params.startDate,
            params.endDate,
            params.isPublic,
            params.preFund,
            params.maxParticipants,
            params.uri,
            params.typeTargetFreq,
            params.quantity,
            params.numFreq,
            params.prompt
        );
        console.log("INICIANDOOOO");
        console.log(mintTx);

        const tx = {
            to: `${process.env.RANKERS_ADDRESS}`,
            data: mintTx.data!,
        };

        const account = privateKeyToAccount(`0x${privateKey}`);

        const bundlerUrl = process.env.BUNDLERS_URL;
        const paymasterUrl = process.env.PAYMASTER_URL || "";

        const nexusClient = await createNexusClient({
            signer: account,
            chain: baseSepolia,
            transport: http(),
            bundlerTransport: http(bundlerUrl),
            paymaster: createBicoPaymasterClient({ paymasterUrl }),
        });

        const sessionsModule = toSmartSessionsValidator({
            account: nexusClient.account,
            signer: account,
        });

        const hash = await nexusClient.installModule({
            module: sessionsModule.moduleInitData,
        });
        const { success: installSuccess } =
            await nexusClient.waitForUserOperationReceipt({ hash });
        const nexusSessionClient = nexusClient.extend(
            smartSessionCreateActions(sessionsModule)
        );

        const sessionOwner = privateKeyToAccount(`0x${privateKey}`);
        const sessionPublicKey = sessionOwner.address;

        const sessionRequestedInfo: CreateSessionDataParams[] = [
            {
                sessionPublicKey,
                actionPoliciesInfo: [
                    {
                        contractAddress: `0x${process.env.RANKERS_ADDRESS}`, // Replace with your contract address
                        rules: [],
                        functionSelector: "0x14ffd664" as Hex, // Function selector for 'incrementNumber'
                    },
                ],
            },
        ];

        const createSessionsResponse = await nexusSessionClient.grantPermission(
            {
                sessionRequestedInfo,
            }
        );

        const [cachedPermissionId] = createSessionsResponse.permissionIds;

        const { success } = await nexusClient.waitForUserOperationReceipt({
            hash: createSessionsResponse.userOpHash,
        });

        let sessionData: SessionData = {
            granter: nexusClient.account.address,
            sessionPublicKey,
            moduleData: {
                permissionIds: [cachedPermissionId],
                mode: SmartSessionMode.USE,
            },
        };
        const compressedSessionData = JSON.stringify(sessionData);

        sessionData = JSON.parse(compressedSessionData) as SessionData;

        const smartSessionNexusClient = await createNexusSessionClient({
            chain: baseSepolia,
            accountAddress: sessionData.granter,
            signer: sessionOwner,
            transport: http(),
            bundlerTransport: http(bundlerUrl),
        });

        const usePermissionsModule = toSmartSessionsValidator({
            account: smartSessionNexusClient.account,
            signer: sessionOwner,
            moduleData: sessionData.moduleData,
        });

        const useSmartSessionNexusClient = smartSessionNexusClient.extend(
            smartSessionUseActions(usePermissionsModule)
        );

        const userOpHash = await useSmartSessionNexusClient.usePermission({
            calls: [
                {
                    to: `0x${process.env.RANKERS_ADDRESS}`, // Replace with your target contract address
                    value: BigInt(0),
                    data: encodeFunctionData({
                        abi: abi,
                        functionName: "createGoal",
                        args: [
                            params.name,
                            params.description,
                            params.category,
                            params.frequency,
                            params.target,
                            params.minimumBet,
                            params.startDate,
                            params.endDate,
                            params.isPublic,
                            params.preFund,
                            params.maxParticipants,
                            params.uri,
                            params.typeTargetFreq,
                            params.quantity,
                            params.numFreq,
                            params.prompt,
                        ],
                    }),
                },
            ],
        });

        console.log(`Transaction hash: ${userOpHash}`);

        res.status(200).send({ hash, receipt: userOpHash });
    } catch (error: any) {
        res.status(500).send({ error: error.message });
    }
});

export default router;
