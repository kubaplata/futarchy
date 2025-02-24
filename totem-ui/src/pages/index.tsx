import World from "@/assets/World.svg";
import Image from "next/image";
import {ArrowTopRightIcon, CrumpledPaperIcon} from "@radix-ui/react-icons";
import MetaDAO from "@/assets/Metadao.svg";
import Details from "@/components/Details";

export default function Index() {
  return (
      <>
          <main className={"mt-10"}>
              <Image className={"w-11/12 max-w-[500px] h-auto mx-auto mb-10"} src={World} alt={"World Icon"}/>
              <div
                  className={"rounded-full w-min px-6 py-1 mx-auto mb-4 flex flex-row justify-center items-center content-center border-[#FFFFFF] border-[0.5px]"}>
                  <Image className={"h-4 w-4"} src={MetaDAO} alt={"Metadao Logo"}/>
                  <p className={"ml-3 nohemi text-[#FFFFFF] font-light whitespace-nowrap"}>
                      MetaDAO Aligned
                  </p>
              </div>
              <h1 className={"nohemi text-[48px] font-medium leading-[1.1] text-center text-[#FFFFFF]"}>
                  Futarchy-governed <br/> everything oracle.
              </h1>
              <p className={"text-center max-w-[500px] mx-auto text-[16px] mt-4 font-light text-balance leading-[1.1] nohemi text-[#ffffff] opacity-70"}>
                  Totem is a decentralised, optimistic oracle. Propose and dispute any statement via market governance.
              </p>
              <div className={"flex mt-4 flex-row justify-center items-center content-center"}>
                  <button
                      className={"rounded-[8px] border-none outline-none bg-[#FFFFFF] text-[#121619] flex flex-row justify-center items-center content-center nohemi text-[16px] px-4 py-2"}>
                      <p className={"font-light"}>
                          Launch App
                      </p>
                      <ArrowTopRightIcon className={"h-5 w-5 ml-2 text-[#121619]"}/>
                  </button>
                  <button
                      className={"rounded-[8px] ml-2 border-[#FFFFFF] border-[1px] border-solid outline-none text-[#FFFFFF] flex flex-row justify-center items-center content-center nohemi text-[16px] px-4 py-2"}>
                      <p className={"font-light"}>
                          Docs
                      </p>
                      <CrumpledPaperIcon className={"h-5 w-5 ml-2 text-[#FFFFFF]"}/>
                  </button>
              </div>
          </main>
          <Details/>
      </>
  );
}