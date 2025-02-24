import Step1 from "@/assets/steps/1.svg";
import Step2 from "@/assets/steps/2.svg";
import Step3 from "@/assets/steps/3.svg";
import Image, {StaticImageData} from "next/image";

function Step({ icon, description, name } : { icon: StaticImageData, name: string, description: string }) {
    return (
        <div className={"mb-12 flex flex-row justify-start items-start content-start"}>
            <Image
                src={icon}
                alt={"Step 1"}
                className={"h-16 w-16 -mt-2"}
            />
            <div className={"flex flex-col ml-4 justify-start items-start content-start"}>
                <div className={""}>
                    <p className={"nohemi ml-4 text-left text-[32px] text-[#FFFFFF] font-normal"}>
                        {name}
                    </p>
                </div>
                <p className={"text-left ml-4 mt-4 text-[#FFFFFF] text-balance font-extralight opacity-90 nohemi"}>
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function Details() {
    return (
        <section
            className={"w-11/12 max-w-[600px] mx-auto mt-32"}
        >
            <Step
                icon={Step1}
                name={"Statement"}
                description={"Submit any statement from the real world. All statements are optimistically considered true unless disputed by DAO member."}
            />
            <Step
                icon={Step2}
                name={"Dispute Period"}
                description={"Anyone can dispute the submitted statement during the 24 hour dispute period. Every dispute is resolved by futarchy governance of the TotemDAO."}
            />
            <Step
                icon={Step3}
                name={"Settlement"}
                description={"If a statement goes undisputed, it's settled as true. If any dispute to a statement has been resolved as valid by the market, statement is settled as false."}
            />
        </section>
    );
}