# On-Chain Transactions — Ink Sepolia

All transactions were generated via ZeroDev ERC-4337 smart accounts using gasless paymaster sponsorship.
Each account is a Kernel v3.1 smart account deployed on Ink Sepolia (chain ID 763373).

Explorer: https://explorer-sepolia.inkonchain.com

---

## Batch 1 — Mixed safe / critical (5 accounts)

| # | Smart Account | Operation | Amount | Risk | Tx Hash |
|---|---------------|-----------|--------|------|---------|
| 1 | `0x5cD5c2bB15fFBe653015377E62926aFa60D5e0a7` | approve(SAFE, tUSDC) | 1 000 | ✅ Safe | [0x85c4503d…](https://explorer-sepolia.inkonchain.com/tx/0x85c4503d78cbc60ac9114fc6df1185a42989376b5e4773d52a1acedbecc1ba06) |
| 2 | `0x5cD5c2bB15fFBe653015377E62926aFa60D5e0a7` | approve(DrainerMock, UNLIMITED) | MAX | 🚨 Critical | [0x933b524d…](https://explorer-sepolia.inkonchain.com/tx/0x933b524d020f1f7b42dfd8aeb810794d20d4b796f864489552b772cd07ebb889) |
| 3 | `0x71861c2E6740D1c96F4E3421A5D003B087F458aF` | approve(SAFE, tUSDC) | 500 | ✅ Safe | [0x3ddd30a4…](https://explorer-sepolia.inkonchain.com/tx/0x3ddd30a43615dd908265727758b72b136a62ed1df162520327d88be6cafc1315) |
| 4 | `0x70158D5D284516B2B2367Fb5240BC32B157699d2` | approve(SAFE, tUSDC) | 1 000 | ✅ Safe | [0xfed8e329…](https://explorer-sepolia.inkonchain.com/tx/0xfed8e329cec4d068a95c7d37b97cb074b743b1228800f8594b6cd1f1c3f99db4) |
| 5 | `0x9a0445B6807D34d9Fe345c92A100AAEa7F82c757` | approve(SAFE, tUSDC) | 500 | ✅ Safe | [0x03f452f4…](https://explorer-sepolia.inkonchain.com/tx/0x03f452f48b0aad9ddf7f4ba2e7372fc94a6579264cc2891430fcfc370ed15f56) |
| 6 | `0x6B111bE87368Ae2C32f7eE8b7aaF6ef714be5D54` | approve(SAFE, tUSDC) | 1 000 | ✅ Safe | [0xedc67fd4…](https://explorer-sepolia.inkonchain.com/tx/0xedc67fd4f40d9daa01ba243389bef4bb2287e8926e21099d0adcd5e60a72138e) |
| 7 | `0x6B111bE87368Ae2C32f7eE8b7aaF6ef714be5D54` | approve(DrainerMock, UNLIMITED) | MAX | 🚨 Critical | [0x43d8a9ae…](https://explorer-sepolia.inkonchain.com/tx/0x43d8a9ae9d839a32fd243dbd4d74aa5d10280401fe2e45aa77d242641bb2dded) |

**Batch 1 summary:** 7 txs · 5 accounts · 5 safe · 2 critical

---

## Batch 2 — Varied amounts (5 accounts)

| # | Smart Account | Operation | Amount | Risk | Tx Hash |
|---|---------------|-----------|--------|------|---------|
| 8 | `0xF64a5A1f30Abc8fdb46f4367C8651605b5bE6b21` | approve(SAFE, tUSDC) | 250 | ✅ Safe | [0x4bcab432…](https://explorer-sepolia.inkonchain.com/tx/0x4bcab43272c1096801326b24a44b3d5ee6515cc8026fdcf3bb7538d1fc544f22) |
| 9 | `0xF64a5A1f30Abc8fdb46f4367C8651605b5bE6b21` | approve(DrainerMock, UNLIMITED) | MAX | 🚨 Critical | [0xa1377a9a…](https://explorer-sepolia.inkonchain.com/tx/0xa1377a9a9a15af1d42ce08cb7cef86386349e5e7217ba98bba7a7a9392d1b51d) |
| 10 | `0xf35EE7326024e78B68C27dcFb01e4E9DC76AabBA` | approve(SAFE, tUSDC) | 750 | ✅ Safe | [0xf66470d0…](https://explorer-sepolia.inkonchain.com/tx/0xf66470d0dba5d5a41a9db6d7dc23c6497cee67a162e45129f0164030a680b32f) |
| 11 | `0xf35EE7326024e78B68C27dcFb01e4E9DC76AabBA` | approve(SAFE, tUSDC) | 2 000 | ✅ Safe | [0xb7bc3723…](https://explorer-sepolia.inkonchain.com/tx/0xb7bc37230aed72878e0d07243d3da01857fa0b1746e7d3a0ce7a37242dc9e7ff) |
| 12 | `0x711d980b7C6162AB2D5856c00645D63637EEb87D` | approve(DrainerMock, UNLIMITED) | MAX | 🚨 Critical | [0xa2c60398…](https://explorer-sepolia.inkonchain.com/tx/0xa2c603984c8d2856fb38eac8e2e343feeec997e55832f2f82a0f031448418e00) |
| 13 | `0x711d980b7C6162AB2D5856c00645D63637EEb87D` | approve(SAFE, tUSDC) | 100 | ✅ Safe | [0xbe345ea3…](https://explorer-sepolia.inkonchain.com/tx/0xbe345ea388c1abc68449e779646182357f2096fa8cd3d6a3b02762aec61055fd) |
| 14 | `0x9995E353D7c072469B7E5b17f2B1C1B592661700` | approve(SAFE, tUSDC) | 5 000 | ✅ Safe | [0xd21888f5…](https://explorer-sepolia.inkonchain.com/tx/0xd21888f514e5c9f9f056aae60b7def5b929b72546eab95ec2db481e8a126c019) |
| 15 | `0x299Dee40b8E39EF3b71E8e7975B8f53aD861419a` | approve(SAFE, tUSDC) | 1 500 | ✅ Safe | [0x9b4dfd77…](https://explorer-sepolia.inkonchain.com/tx/0x9b4dfd778f402ea6ad47dd1e18df31780a157eaa6bf76a54edc7fc9d19c5a238) |
| 16 | `0x299Dee40b8E39EF3b71E8e7975B8f53aD861419a` | approve(SAFE, tUSDC) | 3 000 | ✅ Safe | [0xed7920e1…](https://explorer-sepolia.inkonchain.com/tx/0xed7920e1e4930ae93ae6dcec7e8cfb615abe5458ed4dd471b7b90785726f0327) |

**Batch 2 summary:** 9 txs · 5 accounts · 7 safe · 2 critical

---

## Total

| Metric | Value |
|--------|-------|
| Total transactions | **16** |
| Unique smart accounts | **10** |
| Safe transactions | **12** |
| Critical (intercepted) | **4** |
| Gas paid by user | **0 ETH** (ZeroDev paymaster) |
| Network | Ink Sepolia (chain ID 763373) |
| EntryPoint | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` (v0.7) |
| Kernel version | v3.1 |

---

## Contracts involved

| Contract | Address | Role |
|----------|---------|------|
| MockERC20 (tUSDC) | `0x641822A13272b91af7D64245871523fD402156d6` | Token used for approve/drain operations |
| DrainerMock | `0x3Abb24f9016212f997767d8b85feCA98913a5933` | Blacklisted malicious contract target |
| SAFE (recipient) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Trusted spender (safe approve target) |
| InkSecPaymaster | `0xA0c90BDd4578Bc4955Ff3350059837760af1fCEA` | Validates & blocks blacklisted UserOps |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 entrypoint |

---

## What "Critical" means

Transactions flagged as Critical (rows 2, 7, 9, 12) are:
- `approve(DrainerMock, UNLIMITED)` — grants unlimited tUSDC allowance to a blacklisted drainer contract
- InkSec Guard risk engine scores these at **80–100 / 100** (blacklist +80, unlimited approval +40, capped at 100)
- The InkSecPaymaster refuses gas sponsorship for any UserOp targeting `DrainerMock`
- Protection operates at two independent layers: **pre-sign warning** (simulation) and **on-chain enforcement** (paymaster)
