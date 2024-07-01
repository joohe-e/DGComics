INCLUDES=$$(python3 -m pybind11 --includes)
EXT=$$(python3-config --extension-suffix)


build: graphComic.cpp
	g++ -O2 -shared -std=c++11 -fPIC $(INCLUDES) graphComic.cpp -o graphComic$(EXT)

debug: graphComic.cpp
	g++ -DDEBUG -O2 -std=c++11 -fPIC $(INCLUDES) graphComic.cpp -o a