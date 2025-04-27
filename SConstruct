#!/usr/bin/env python

env = SConscript("./godot-cpp/SConstruct")

# For the reference:
# - CCFLAGS are compilation flags shared between C and C++
# - CFLAGS are for C-specific compilation flags
# - CXXFLAGS are for C++-specific compilation flags
# - CPPFLAGS are for pre-processor flags
# - CPPDEFINES are for pre-processor defines
# - LINKFLAGS are for linking flags

# tweak this if you want to use different folders, or more folders, to store your source code in.
env.Append(CPPPATH=["src/"])
sources = []
sources.extend(Glob("src/*.cpp"))
sources.extend(Glob("src/addons/*.cpp"))
sources.extend(Glob("src/addons/preprocessor/*.cpp"))
sources.extend(Glob("src/data/*.cpp"))
sources.extend(Glob("src/data/ai/*.cpp"))
sources.extend(Glob("src/data/buffs/*.cpp"))
sources.extend(Glob("src/data/characters/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/Passive/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/Passive/IdleCheck/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/Passive/IdleParticle/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/Passive/PassiveParticle/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/Passive/SoulCrusher/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S1_Q_OrbOfDeception/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S1_Q_OrbOfDeception/AhriOrbMissile/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S1_Q_OrbOfDeception/AhriOrbReturn/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S2_W_FoxFire/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S2_W_FoxFire/AhriFoxFireMissile/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S2_W_FoxFire/AhriFoxFireMissileTwo/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S3_E_Seduce/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S3_E_Seduce/AhriSeduceMissile/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S4_R_Tumble/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S4_R_Tumble/AhriTumbleKick/*.cpp"))
sources.extend(Glob("src/data/characters/Ahri/S4_R_Tumble/AhriTumbleMissile/*.cpp"))
sources.extend(Glob("src/data/characters/Turrets/*.cpp"))
sources.extend(Glob("src/data/characters/Turrets/Passive/*.cpp"))
sources.extend(Glob("src/data/levels/*.cpp"))
sources.extend(Glob("src/data/levels/1/*.cpp"))
sources.extend(Glob("src/data/levels/1/scripts/*.cpp"))
sources.extend(Glob("src/data/scripts/*.cpp"))
sources.extend(Glob("src/data/spells/*.cpp"))
sources.extend(Glob("src/data/spells/Recall/*.cpp"))
sources.extend(Glob("src/engine/*.cpp"))
sources.extend(Glob("src/engine/ai/*.cpp"))
sources.extend(Glob("src/engine/api/*.cpp"))
sources.extend(Glob("src/engine/buffs/*.cpp"))
sources.extend(Glob("src/engine/effects/*.cpp"))
sources.extend(Glob("src/engine/events/*.cpp"))
sources.extend(Glob("src/engine/game/*.cpp"))
sources.extend(Glob("src/engine/game/ai/*.cpp"))
sources.extend(Glob("src/engine/game/lights/*.cpp"))
sources.extend(Glob("src/engine/game/ui/*.cpp"))
sources.extend(Glob("src/engine/game/ui/font_emitter/*.cpp"))
sources.extend(Glob("src/engine/game/ui/minimap/*.cpp"))
sources.extend(Glob("src/engine/level/*.cpp"))
sources.extend(Glob("src/engine/passive/*.cpp"))
sources.extend(Glob("src/engine/spells/*.cpp"))
sources.extend(Glob("src/engine/spells/attacks/*.cpp"))
sources.extend(Glob("src/engine/spells/missiles/*.cpp"))
sources.extend(Glob("src/engine/unit/*.cpp"))

if env["target"] in ["editor", "template_debug"]:
    doc_data = env.GodotCPPDocData("src/gen/doc_data.gen.cpp", source=Glob("doc_classes/*.xml"))
    sources.append(doc_data)

if env["platform"] == "macos":
    library = env.SharedLibrary(
        "project/bin/libgdexample.{}.{}.framework/libgdexample.{}.{}".format(
            env["platform"], env["target"], env["platform"], env["target"]
        ),
        source=sources,
    )
elif env["platform"] == "ios":
    if env["ios_simulator"]:
        library = env.StaticLibrary(
            "project/bin/libgdexample.{}.{}.simulator.a".format(env["platform"], env["target"]),
            source=sources,
        )
    else:
        library = env.StaticLibrary(
            "project/bin/libgdexample.{}.{}.a".format(env["platform"], env["target"]),
            source=sources,
        )
else:
    library = env.SharedLibrary(
        "project/bin/libgdexample{}{}".format(env["suffix"], env["SHLIBSUFFIX"]),
        source=sources,
    )

env.NoCache(library)
Default(library)
