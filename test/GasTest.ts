import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("GasTest", function () {
  const Deploy = async () => {
    const Gas = await ethers.deployContract("GasTest");

    return { Gas };
  };

  it("should show gas usage", async function () {
    const { Gas } = await loadFixture(Deploy);

    // 36916 + 22887 = 59,803
    for (let index = 0; index < 100; index++) {
      Gas.AllocateDelete(); // 36916
      Gas.Delete(); //         22887
    }

    // 40918 + 22622 = 63,540
    for (let index = 0; index < 100; index++) {
      Gas.AllocateZero(); // 40918
      Gas.Zero(); //         22622
    }
  });
});
